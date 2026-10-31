/**
 * Konversi angka rupiah ke kalimat terbilang Bahasa Indonesia
 * Contoh: 250000 -> "Dua Ratus Lima Puluh Ribu Rupiah"
 */

const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

function konversiBilangan(n: number): string {
  if (n < 12) {
    return satuan[n];
  } else if (n < 20) {
    return konversiBilangan(n - 10) + ' Belas';
  } else if (n < 100) {
    const sisa = n % 10;
    return konversiBilangan(Math.floor(n / 10)) + ' Puluh' + (sisa > 0 ? ' ' + konversiBilangan(sisa) : '');
  } else if (n < 200) {
    const sisa = n % 100;
    return 'Seratus' + (sisa > 0 ? ' ' + konversiBilangan(sisa) : '');
  } else if (n < 1000) {
    const sisa = n % 100;
    return konversiBilangan(Math.floor(n / 100)) + ' Ratus' + (sisa > 0 ? ' ' + konversiBilangan(sisa) : '');
  } else if (n < 2000) {
    const sisa = n % 1000;
    return 'Seribu' + (sisa > 0 ? ' ' + konversiBilangan(sisa) : '');
  } else if (n < 1000000) {
    const sisa = n % 1000;
    return konversiBilangan(Math.floor(n / 1000)) + ' Ribu' + (sisa > 0 ? ' ' + konversiBilangan(sisa) : '');
  } else if (n < 1000000000) {
    const sisa = n % 1000000;
    return konversiBilangan(Math.floor(n / 1000000)) + ' Juta' + (sisa > 0 ? ' ' + konversiBilangan(sisa) : '');
  } else if (n < 1000000000000) {
    const sisa = n % 1000000000;
    return konversiBilangan(Math.floor(n / 1000000000)) + ' Miliar' + (sisa > 0 ? ' ' + konversiBilangan(sisa) : '');
  }
  return n.toString();
}

export function terbilangRupiah(nominal: number): string {
  if (nominal <= 0) return 'Nol Rupiah';
  const hasil = konversiBilangan(Math.floor(nominal)).trim();
  return `${hasil} Rupiah`;
}

export function formatRupiah(nominal: number | string): string {
  const num = typeof nominal === 'string' ? parseFloat(nominal) || 0 : nominal;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
