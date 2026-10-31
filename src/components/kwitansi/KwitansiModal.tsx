import React, { useRef } from 'react';
import { Printer, Download, CheckCircle, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Payment, Student, Package } from '../../types';
import { formatRupiah, terbilangRupiah } from '../../lib/numberToIndonesianWords';

interface KwitansiModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  student: Student | null;
  pkg: Package | null;
}

export const KwitansiModal: React.FC<KwitansiModalProps> = ({
  isOpen,
  onClose,
  payment,
  student,
  pkg,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!payment || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  const receiptNumber = payment.receiptNumber || `KWT/2026/11/0001`;
  const paymentDate = payment.paymentDate || new Date().toISOString().split('T')[0];
  const formattedDate = new Date(paymentDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kwitansi Pembayaran Terapi"
      subtitle={`No: ${receiptNumber}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Tombol Cetak / PDF */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl print:hidden">
          <div className="flex items-center gap-2 text-emerald-800 text-xs sm:text-sm font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Status Pembayaran: <strong className="text-emerald-900">LUNAS ({payment.paymentMethod || 'Tunai'})</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </button>
          </div>
        </div>

        {/* Lembar Kwitansi Fisik (A5/A4 printable view) */}
        <div
          ref={printAreaRef}
          id="printable-receipt"
          className="bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 shadow-xs text-slate-800 relative font-sans"
        >
          {/* Header Kop Kwitansi */}
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-5 mb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-xs">
                KT
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  KLINIK TERAPI SISWA CERIA
                </h2>
                <p className="text-xs text-slate-600">
                  Layanan Terapi Wicara, Okupasi, dan Tumbuh Kembang Anak
                </p>
                <p className="text-2xs text-slate-500">
                  Jl. Cempaka Putih Raya No. 45, Jakarta • Telp: (021) 7890-1234
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-md">
                KWITANSI RESMI
              </span>
              <p className="text-xs font-mono font-bold text-slate-700 mt-1.5">{receiptNumber}</p>
              <p className="text-xs text-slate-500">Tanggal: {formattedDate}</p>
            </div>
          </div>

          {/* Rincian Pembayaran Kwitansi */}
          <div className="space-y-4 text-xs sm:text-sm leading-relaxed">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 items-baseline py-1.5 border-b border-dashed border-slate-200">
              <span className="font-semibold text-slate-600">Telah Diterima Dari</span>
              <span className="col-span-2 sm:col-span-3 font-bold text-slate-900 text-sm">
                : {student.parentName}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 items-baseline py-1.5 border-b border-dashed border-slate-200">
              <span className="font-semibold text-slate-600">Nama Siswa Terapi</span>
              <span className="col-span-2 sm:col-span-3 font-semibold text-slate-800">
                : {student.name}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 items-baseline py-1.5 border-b border-dashed border-slate-200">
              <span className="font-semibold text-slate-600">Untuk Pembayaran</span>
              <span className="col-span-2 sm:col-span-3 text-slate-800">
                : SPP Terapi Periode Bulan <strong>{payment.monthYear}</strong> ({pkg?.name || 'Paket Terapi'})
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 items-baseline py-1.5 border-b border-dashed border-slate-200">
              <span className="font-semibold text-slate-600">Metode Bayar</span>
              <span className="col-span-2 sm:col-span-3 font-semibold text-slate-800">
                : {payment.paymentMethod || 'Tunai'} {payment.notes ? `(${payment.notes})` : ''}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 my-3">
              <span className="block text-2xs uppercase tracking-wider font-bold text-slate-500 mb-1">
                Uang Sejumlah (Terbilang):
              </span>
              <p className="font-semibold italic text-slate-900 text-sm sm:text-base">
                "{terbilangRupiah(payment.amount)}"
              </p>
            </div>
          </div>

          {/* Nominal Box & Tanda Tangan */}
          <div className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="w-full sm:w-auto p-4 bg-emerald-50 border-2 border-emerald-400 rounded-xl text-center sm:text-left">
              <span className="block text-2xs uppercase tracking-wider font-bold text-emerald-800">
                JUMLAH DITERIMA:
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                {formatRupiah(payment.amount)}
              </span>
            </div>

            <div className="w-full sm:w-56 text-center text-xs text-slate-700">
              <p className="mb-1 text-2xs text-slate-500">Jakarta, {formattedDate}</p>
              <p className="font-semibold text-slate-800">Petugas Keuangan / Kasir</p>
              
              {/* Tempat Tanda Tangan Digital / Stempel */}
              <div className="h-16 flex items-center justify-center my-1 relative">
                <div className="w-20 h-12 border border-dashed border-emerald-400 rounded-lg bg-emerald-50/50 flex items-center justify-center text-2xs font-bold text-emerald-700 uppercase tracking-wider rotate-[-5deg]">
                  LUNAS
                </div>
              </div>

              <p className="font-bold underline text-slate-900">
                {payment.markedBy || 'Administrator Terapi'}
              </p>
              <p className="text-2xs text-slate-500">NIP. 2023.01.004</p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-3 border-t border-slate-200 text-center text-2xs text-slate-400">
            Bukti pembayaran ini sah dan dicetak secara otomatis melalui Sistem Informasi Absensi & Keuangan Terapi Siswa.
          </div>
        </div>
      </div>
    </Modal>
  );
};
