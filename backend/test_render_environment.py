#!/usr/bin/env python3
"""
Script completo para simular ambiente Render localmente
Testa tudo que pode dar erro no deploy
"""

import subprocess
import sys
import os
import tempfile
import venv
from pathlib import Path
import json

class RenderSimulator:
    def __init__(self):
        self.test_dir = None
        self.venv_path = None
        self.results = []
        
    def log(self, message, status="INFO"):
        """Log com status"""
        icons = {"INFO": "ℹ️", "SUCCESS": "✅", "ERROR": "❌", "WARNING": "⚠️"}
        print(f"{icons.get(status, 'ℹ️')} {message}")
        
    def run_in_venv(self, command, description):
        """Executa comando no ambiente virtual"""
        self.log(f"Executando: {description}")
        
        # Ativar venv e executar comando
        if os.name == 'nt':  # Windows
            activate_script = self.venv_path / "Scripts" / "activate.bat"
            full_command = f'"{activate_script}" && {command}'
        else:  # Linux/Mac
            activate_script = self.venv_path / "bin" / "activate"
            full_command = f'source "{activate_script}" && {command}'
        
        try:
            result = subprocess.run(
                full_command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=600,  # 10 minutos
                cwd=self.test_dir
            )
            
            if result.returncode == 0:
                self.log(f"{description} - SUCESSO", "SUCCESS")
                return True, result.stdout
            else:
                self.log(f"{description} - ERRO", "ERROR")
                self.log(f"STDERR: {result.stderr}", "ERROR")
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            self.log(f"{description} - TIMEOUT", "ERROR")
            return False, "Timeout"
        except Exception as e:
            self.log(f"{description} - EXCEÇÃO: {e}", "ERROR")
            return False, str(e)
    
    def setup_test_environment(self):
        """Configura ambiente de teste"""
        self.log("Configurando ambiente de teste...")
        
        # Criar diretório temporário
        self.test_dir = Path(tempfile.mkdtemp(prefix="melitus_test_"))
        self.log(f"Diretório de teste: {self.test_dir}")
        
        # Copiar arquivos necessários
        current_dir = Path(__file__).parent
        files_to_copy = [
            "requirements.txt",
            "start.sh",
            "runtime.txt",
            ".python-version"
        ]
        
        for file_name in files_to_copy:
            src = current_dir / file_name
            if src.exists():
                dst = self.test_dir / file_name
                dst.write_text(src.read_text(), encoding='utf-8')
                self.log(f"Copiado: {file_name}")
        
        # Copiar diretório app
        app_src = current_dir / "app"
        if app_src.exists():
            app_dst = self.test_dir / "app"
            self.copy_directory(app_src, app_dst)
            self.log("Copiado: diretório app")
        
        return True
    
    def copy_directory(self, src, dst):
        """Copia diretório recursivamente"""
        dst.mkdir(exist_ok=True)
        for item in src.iterdir():
            if item.is_file():
                (dst / item.name).write_bytes(item.read_bytes())
            elif item.is_dir() and item.name != "__pycache__":
                self.copy_directory(item, dst / item.name)
    
    def create_virtual_environment(self):
        """Cria ambiente virtual Python 3.11"""
        self.log("Criando ambiente virtual Python 3.11...")
        
        self.venv_path = self.test_dir / "venv"
        
        try:
            venv.create(self.venv_path, with_pip=True)
            self.log("Ambiente virtual criado", "SUCCESS")
            return True
        except Exception as e:
            self.log(f"Erro ao criar venv: {e}", "ERROR")
            return False
    
    def test_python_version(self):
        """Testa versão do Python"""
        self.log("Testando versão Python...")
        
        success, output = self.run_in_venv("python --version", "Verificação versão Python")
        
        if success and "3.11" in output:
            self.log("Python 3.11 detectado", "SUCCESS")
            return True
        else:
            self.log(f"Versão Python incorreta: {output}", "ERROR")
            return False
    
    def test_environment_variables(self):
        """Testa variáveis de ambiente"""
        self.log("Configurando variáveis de ambiente...")
        
        env_vars = {
            'CRYPTOGRAPHY_DONT_BUILD_RUST': '1',
            'BCRYPT_DONT_BUILD_RUST': '1',
            'PIP_PREFER_BINARY': '1',
            'PIP_NO_CACHE_DIR': '1'
        }
        
        # Criar script para definir variáveis
        env_script = self.test_dir / "set_env.py"
        env_script.write_text(f"""
import os
env_vars = {env_vars}
for key, value in env_vars.items():
    os.environ[key] = value
    print(f"{{key}}={{value}}")
print("Variáveis configuradas!")
""")
        
        success, output = self.run_in_venv("python set_env.py", "Configuração variáveis ambiente")
        return success
    
    def test_dependencies_installation(self):
        """Testa instalação de dependências"""
        self.log("Testando instalação de dependências...")
        
        # Comando exato usado no Render
        install_cmd = "pip install --prefer-binary --no-cache-dir --no-compile --only-binary=all -r requirements.txt"
        
        success, output = self.run_in_venv(install_cmd, "Instalação dependências")
        
        if success:
            self.log("Dependências instaladas com sucesso", "SUCCESS")
            return True
        else:
            self.log("Falha na instalação de dependências", "ERROR")
            return False
    
    def test_critical_imports(self):
        """Testa importações críticas"""
        self.log("Testando importações críticas...")
        
        import_script = self.test_dir / "test_imports.py"
        import_script.write_text("""
import sys
critical_modules = [
    'fastapi',
    'uvicorn', 
    'sqlmodel',
    'psycopg2',
    'alembic',
    'cryptography',
    'jose',
    'bcrypt',
    'passlib',
    'httpx',
    'pydantic',
    'pydantic_settings'
]

failed = []
for module in critical_modules:
    try:
        __import__(module)
        print(f"✅ {module}")
    except ImportError as e:
        print(f"❌ {module}: {e}")
        failed.append(module)

if failed:
    print(f"FALHAS: {failed}")
    sys.exit(1)
else:
    print("TODAS IMPORTAÇÕES OK!")
    sys.exit(0)
""")
        
        success, output = self.run_in_venv("python test_imports.py", "Teste importações")
        return success
    
    def test_app_initialization(self):
        """Testa inicialização da aplicação"""
        self.log("Testando inicialização da aplicação...")
        
        app_test_script = self.test_dir / "test_app.py"
        app_test_script.write_text("""
import sys
import os
sys.path.insert(0, '.')

try:
    from app.main import app
    print("✅ App importada com sucesso")
    
    # Verificar se é uma instância FastAPI
    if hasattr(app, 'openapi'):
        print("✅ FastAPI configurado corretamente")
        print("✅ Aplicação pronta para produção!")
        sys.exit(0)
    else:
        print("❌ App não é uma instância FastAPI válida")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ Erro na inicialização: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
""")
        
        success, output = self.run_in_venv("python test_app.py", "Teste inicialização app")
        return success
    
    def run_full_test(self):
        """Executa teste completo"""
        self.log("🔥 INICIANDO SIMULAÇÃO COMPLETA DO RENDER", "INFO")
        self.log("=" * 60)
        
        tests = [
            ("Setup Ambiente", self.setup_test_environment),
            ("Criar Virtual Env", self.create_virtual_environment),
            ("Versão Python", self.test_python_version),
            ("Variáveis Ambiente", self.test_environment_variables),
            ("Instalação Deps", self.test_dependencies_installation),
            ("Importações", self.test_critical_imports),
            ("Inicialização App", self.test_app_initialization)
        ]
        
        results = []
        
        for test_name, test_func in tests:
            self.log(f"\n🧪 TESTE: {test_name}")
            self.log("-" * 40)
            
            try:
                success = test_func()
                results.append((test_name, success))
                
                if success:
                    self.log(f"{test_name} - PASSOU", "SUCCESS")
                else:
                    self.log(f"{test_name} - FALHOU", "ERROR")
                    
            except Exception as e:
                self.log(f"{test_name} - EXCEÇÃO: {e}", "ERROR")
                results.append((test_name, False))
        
        # Relatório final
        self.log("\n" + "=" * 60)
        self.log("📊 RELATÓRIO FINAL DA SIMULAÇÃO")
        self.log("=" * 60)
        
        passed = 0
        total = len(results)
        
        for test_name, success in results:
            status = "✅ PASSOU" if success else "❌ FALHOU"
            self.log(f"{test_name:20} {status}")
            if success:
                passed += 1
        
        self.log(f"\nRESULTADO: {passed}/{total} testes passaram")
        
        if passed == total:
            self.log("🎉 TODOS OS TESTES PASSARAM!", "SUCCESS")
            self.log("🚀 SEU PROJETO ESTÁ PRONTO PARA O RENDER!", "SUCCESS")
            return True
        else:
            self.log("⚠️ ALGUNS TESTES FALHARAM!", "WARNING")
            self.log("🔧 Corrija os problemas antes do deploy", "WARNING")
            return False
    
    def cleanup(self):
        """Limpa arquivos temporários"""
        if self.test_dir and self.test_dir.exists():
            import shutil
            try:
                shutil.rmtree(self.test_dir)
                self.log("Limpeza concluída")
            except Exception as e:
                self.log(f"Erro na limpeza: {e}", "WARNING")

def main():
    simulator = RenderSimulator()
    
    try:
        success = simulator.run_full_test()
        return 0 if success else 1
    except KeyboardInterrupt:
        simulator.log("Teste interrompido pelo usuário", "WARNING")
        return 1
    except Exception as e:
        simulator.log(f"Erro inesperado: {e}", "ERROR")
        return 1
    finally:
        simulator.cleanup()

if __name__ == "__main__":
    sys.exit(main())