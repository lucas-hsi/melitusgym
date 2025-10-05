# Script para capturar erros dos testes de integração
# Executa os testes e salva a saída completa em um arquivo

Write-Host "Executando testes de integração e capturando erros..." -ForegroundColor Yellow

# Navegar para o diretório frontend
Set-Location "frontend"

# Executar os testes e capturar toda a saída (stdout e stderr)
try {
    # Executar npm test e capturar saída
    $testOutput = npm test -- --testPathPattern="clinical.test.tsx" --verbose --no-coverage 2>&1
    
    # Salvar a saída em arquivo
    $errorFile = "../test_errors_output.txt"
    $testOutput | Out-File -FilePath $errorFile -Encoding UTF8
    
    Write-Host "Saída dos testes salva em: $errorFile" -ForegroundColor Green
    
    # Mostrar um resumo na tela
    Write-Host "`nResumo dos erros:" -ForegroundColor Red
    $testOutput | Select-String -Pattern "FAIL|Error|TypeError|SyntaxError|ReferenceError" | ForEach-Object {
        Write-Host $_.Line -ForegroundColor Red
    }
    
} catch {
    Write-Host "Erro ao executar os testes: $($_.Exception.Message)" -ForegroundColor Red
    $_.Exception.Message | Out-File -FilePath "../test_execution_error.txt" -Encoding UTF8
}

# Voltar ao diretório raiz
Set-Location ".."

Write-Host "`nScript concluído. Verifique os arquivos de erro gerados." -ForegroundColor Cyan