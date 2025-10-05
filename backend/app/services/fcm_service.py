import json
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlmodel import Session, select
from google.auth.transport.requests import Request
from google.oauth2 import service_account
import os
from ..models import PushAlarm, NotificationToken, User
from .database import get_session
import logging

logger = logging.getLogger(__name__)

class FCMService:
    def __init__(self):
        self.project_id = os.getenv("FCM_PROJECT_ID")
        self.credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        self.fcm_url = f"https://fcm.googleapis.com/v1/projects/{self.project_id}/messages:send"
        self._access_token = None
        self._token_expiry = None
        
    def _get_access_token(self) -> str:
        """Obtém token de acesso OAuth2 para FCM HTTP v1"""
        
        # Verificar se o token ainda é válido
        if self._access_token and self._token_expiry and datetime.utcnow() < self._token_expiry:
            return self._access_token
            
        try:
            # Carregar credenciais da conta de serviço
            credentials = service_account.Credentials.from_service_account_file(
                self.credentials_path,
                scopes=['https://www.googleapis.com/auth/firebase.messaging']
            )
            
            # Obter token de acesso
            credentials.refresh(Request())
            
            self._access_token = credentials.token
            self._token_expiry = datetime.utcnow() + timedelta(seconds=3600)  # 1 hora
            
            return self._access_token
            
        except Exception as e:
            logger.error(f"Erro ao obter token de acesso FCM: {e}")
            raise
    
    async def send_notification(
        self, 
        token: str, 
        title: str, 
        body: str, 
        data: Optional[Dict[str, str]] = None,
        icon: str = "/icon-192x192.svg"
    ) -> bool:
        """Envia notificação push via FCM HTTP v1"""
        
        try:
            access_token = self._get_access_token()
            
            # Preparar payload da mensagem
            message = {
                "message": {
                    "token": token,
                    "notification": {
                        "title": title,
                        "body": body,
                        "icon": icon
                    },
                    "webpush": {
                        "headers": {
                            "Urgency": "high"
                        },
                        "notification": {
                            "title": title,
                            "body": body,
                            "icon": icon,
                            "badge": "/icon-192x192.svg",
                            "requireInteraction": True,
                            "actions": [
                                {
                                    "action": "open",
                                    "title": "Abrir"
                                }
                            ]
                        }
                    }
                }
            }
            
            # Adicionar dados customizados se fornecidos
            if data:
                message["message"]["data"] = data
            
            # Enviar requisição
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.fcm_url,
                    json=message,
                    headers=headers
                ) as response:
                    if response.status == 200:
                        logger.info(f"Notificação enviada com sucesso para token: {token[:20]}...")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Erro ao enviar notificação: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Erro ao enviar notificação push: {e}")
            return False
    
    def _should_fire_alarm(self, alarm: PushAlarm) -> bool:
        """Verifica se um alarme deve ser disparado"""
        
        if not alarm.active:
            return False
            
        now = datetime.utcnow()
        
        # Parse do schedule (assumindo formato ISO datetime por simplicidade)
        try:
            # Se for um datetime ISO
            if 'T' in alarm.schedule:
                scheduled_time = datetime.fromisoformat(alarm.schedule.replace('Z', '+00:00'))
                
                # Verificar se está na janela de 1 minuto
                time_diff = abs((now - scheduled_time).total_seconds())
                
                # Se já disparou recentemente, não disparar novamente
                if alarm.last_fire_at:
                    last_fire_diff = (now - alarm.last_fire_at).total_seconds()
                    if last_fire_diff < 300:  # 5 minutos
                        return False
                
                return time_diff <= 60  # 1 minuto de janela
                
            # TODO: Implementar parsing de cron expressions se necessário
            else:
                return False
                
        except Exception as e:
            logger.error(f"Erro ao parsear schedule do alarme {alarm.id}: {e}")
            return False
    
    def _get_notification_content(self, alarm: PushAlarm) -> Dict[str, str]:
        """Gera conteúdo da notificação baseado no tipo de alarme"""
        
        templates = {
            "water": {
                "title": "💧 Hora de se hidratar!",
                "body": "Lembre-se de beber água para manter sua saúde em dia.",
                "route": "/dashboard"
            },
            "post_meal": {
                "title": "🍽️ Medição pós-refeição",
                "body": "Hora de medir sua glicemia após a refeição.",
                "route": "/saude?post_refeicao=1"
            },
            "glucose": {
                "title": "🩸 Medição de glicemia",
                "body": "Não esqueça de medir sua glicemia.",
                "route": "/saude?glucose=1"
            },
            "bp": {
                "title": "❤️ Medição de pressão",
                "body": "Hora de verificar sua pressão arterial.",
                "route": "/saude?pressure=1"
            },
            "custom": {
                "title": "⏰ Lembrete personalizado",
                "body": "Você tem um lembrete agendado.",
                "route": "/dashboard"
            }
        }
        
        template = templates.get(alarm.type, templates["custom"])
        
        # Usar payload customizado se disponível
        payload = alarm.payload
        if payload:
            title = payload.get("title", template["title"])
            body = payload.get("body", template["body"])
            route = payload.get("route", template["route"])
        else:
            title = template["title"]
            body = template["body"]
            route = template["route"]
        
        return {
            "title": title,
            "body": body,
            "route": route,
            "alarmId": str(alarm.id)
        }
    
    async def scan_and_fire_alarms(self):
        """Varre alarmes pendentes e dispara notificações"""
        
        try:
            session = next(get_session())
            
            # Buscar alarmes ativos
            alarms = session.exec(
                select(PushAlarm).where(PushAlarm.active == True)
            ).all()
            
            for alarm in alarms:
                if self._should_fire_alarm(alarm):
                    # Buscar tokens do usuário
                    tokens = session.exec(
                        select(NotificationToken).where(
                            NotificationToken.user_id == alarm.user_id
                        )
                    ).all()
                    
                    if not tokens:
                        logger.warning(f"Nenhum token encontrado para usuário {alarm.user_id}")
                        continue
                    
                    # Gerar conteúdo da notificação
                    content = self._get_notification_content(alarm)
                    
                    # Enviar para todos os tokens do usuário
                    success_count = 0
                    for token in tokens:
                        success = await self.send_notification(
                            token=token.token,
                            title=content["title"],
                            body=content["body"],
                            data={
                                "route": content["route"],
                                "alarmId": content["alarmId"]
                            }
                        )
                        
                        if success:
                            success_count += 1
                    
                    # Atualizar last_fire_at se pelo menos uma notificação foi enviada
                    if success_count > 0:
                        alarm.last_fire_at = datetime.utcnow()
                        session.add(alarm)
                        session.commit()
                        
                        logger.info(
                            f"Alarme {alarm.id} disparado para {success_count} dispositivos"
                        )
            
            session.close()
            
        except Exception as e:
            logger.error(f"Erro na varredura de alarmes: {e}")

# Instância global do serviço
fcm_service = FCMService()

# Função para executar varredura periódica
async def start_alarm_scheduler():
    """Inicia o agendador de alarmes"""
    
    logger.info("Iniciando agendador de alarmes FCM")
    
    while True:
        try:
            await fcm_service.scan_and_fire_alarms()
            await asyncio.sleep(60)  # Verificar a cada minuto
        except Exception as e:
            logger.error(f"Erro no agendador de alarmes: {e}")
            await asyncio.sleep(60)