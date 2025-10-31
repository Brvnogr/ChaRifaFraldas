const SPREADSHEET_ID = " ID_AQUI "; // opcional: cole o ID da planilha aqui. Se vazio, usa a planilha ativa
const SHEET_NAME = 'Reservas';


function getSpreadsheet() {
return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActive();
}


function doGet(e) {
return HtmlService.createHtmlOutputFromFile('Index')
.setTitle('Chá Rifa de Fraldas')
.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


// Retorna um objeto com os números já reservados -> {"1": true, "5": true, ...}
function getReservedNumbers() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return {};

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return {}; // Nenhum dado além do cabeçalho

  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const reserved = {};
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const num = row[1]; // Coluna B = número
    if (num) reserved[String(num)] = true;
  }
  return reserved;
}

// Tenta reservar um número. Retorna {success: boolean, message: string}
function reserveNumber(payload) {
  const numero = String(payload.numero);

  // Obtém um lock global do script
  const lock = LockService.getScriptLock();
  try {
    // Espera até 15 segundos se outro processo estiver usando o lock
    lock.waitLock(15000);

    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Timestamp','Numero','Nome','Telefone','Endereco']);
    }

    // Recheca dentro do lock (garante que ninguém gravou no meio tempo)
    const reserved = getReservedNumbers();
    if (reserved[numero]) {
      return {success:false, message:'Desculpe, mas este número já foi reservado por outra pessoa.'};
    }

    // Grava a reserva
    sheet.appendRow([
      new Date(),
      numero,
      payload.nome || '',
      payload.telefone || '',
      payload.endereco || ''
    ]);

    return {success:true, message:'Número escolhido com sucesso. Boa sorte!'};

  } catch (e) {
    return {success:false, message:'Erro interno: ' + e.message};

  } finally {
    // Libera o lock para o próximo usuário
    lock.releaseLock();
  }
}
