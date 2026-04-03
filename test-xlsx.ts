import * as XLSX from 'xlsx';
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['Tarih', 'Değer'],
  [new Date(2025, 1, 27), 100] // 27 Feb 2025
]);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const bstr = XLSX.write(wb, { type: 'binary' });

const wb2 = XLSX.read(bstr, { type: 'binary', cellDates: true });
const ws2 = wb2.Sheets['Sheet1'];
const rawData = XLSX.utils.sheet_to_json(ws2, { raw: true });
console.log('raw: true', rawData);

const rawData2 = XLSX.utils.sheet_to_json(ws2, { raw: false, dateNF: 'dd.mm.yyyy' });
console.log('raw: false', rawData2);
