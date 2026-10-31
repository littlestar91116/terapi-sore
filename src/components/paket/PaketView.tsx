import React, { useState } from 'react';
import { Package as PackageIcon, Edit2, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Package } from '../../types';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { formatRupiah } from '../../lib/numberToIndonesianWords';

export const PaketView: React.FC = () => {
  const { currentRole } = useAuth();
  const { packages, updatePackage } = useData();

  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    priceMonthly: number;
    description: string;
  }>({
    name: '',
    priceMonthly: 0,
    description: '',
  });

  const canEdit = currentRole === 'admin' || currentRole === 'kepala';

  const handleOpenEdit = (pkg: Package) => {
    setEditingPkg(pkg);
    setFormData({
      name: pkg.name,
      priceMonthly: pkg.priceMonthly,
      description: pkg.description || '',
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPkg) return;

    updatePackage({
      ...editingPkg,
      name: formData.name,
      priceMonthly: formData.priceMonthly,
      description: formData.description,
    });
    setEditingPkg(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Paket Terapi Siswa (Master Tarif)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar 10 paket resmi klinik berdasarkan durasi (1 atau 2 jam) dan frekuensi sesi per minggu.
          </p>
        </div>

        {canEdit && (
          <Badge variant="blue" size="md">
            Mode Edit Tarif Aktif (Admin & Kepala)
          </Badge>
        )}
      </div>

      {/* Info Card Pengajuan Izin */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 leading-relaxed">
          <strong>Ketentuan Khusus Perizinan:</strong> Sesuai kebijakan lembaga, sistem pengajuan izin hanya
          berlaku untuk siswa dengan <strong>Paket 2 Jam</strong>. Siswa dengan paket 1 jam tidak memiliki
          menu izin karena durasi singkat dan slot padat.
        </div>
      </div>

      {/* Tabel 10 Paket Terapi */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Durasi</th>
                <th className="px-4 py-3.5">Frekuensi Mingguan</th>
                <th className="px-5 py-3.5">Nama Paket Terapi</th>
                <th className="px-5 py-3.5">Tarif Per Bulan</th>
                <th className="px-4 py-3.5">Fasilitas Izin</th>
                {canEdit && <th className="px-5 py-3.5 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {packages.map((pkg) => {
                const is2Hours = pkg.durationHours === 2;
                return (
                  <tr key={pkg.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Durasi */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                            is2Hours
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pkg.durationHours}J
                        </div>
                        <span className="font-bold text-slate-800">{pkg.durationHours} Jam</span>
                      </div>
                    </td>

                    {/* Frekuensi */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {pkg.frequencyPerWeek}x / minggu
                      </span>
                    </td>

                    {/* Nama & Deskripsi */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{pkg.name}</div>
                      <p className="text-2xs text-slate-500 mt-0.5">{pkg.description}</p>
                    </td>

                    {/* Harga */}
                    <td className="px-5 py-4">
                      <div className="font-black text-sm text-emerald-700">
                        {formatRupiah(pkg.priceMonthly)}
                      </div>
                      <span className="text-3xs text-slate-400 uppercase">Per Bulan</span>
                    </td>

                    {/* Hak Izin */}
                    <td className="px-4 py-4">
                      <Badge variant={is2Hours ? 'green' : 'yellow'}>
                        {is2Hours ? 'Bisa Izin' : 'Tidak Bisa Izin'}
                      </Badge>
                    </td>

                    {/* Aksi */}
                    {canEdit && (
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(pkg)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit Harga
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Harga Paket */}
      <Modal
        isOpen={Boolean(editingPkg)}
        onClose={() => setEditingPkg(null)}
        title="Edit Tarif Paket Terapi"
        subtitle={`Ubah harga resmi untuk ${editingPkg?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Nama Paket Terapi
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Harga Per Bulan (Rp) *
            </label>
            <input
              type="number"
              step={10000}
              required
              value={formData.priceMonthly}
              onChange={(e) =>
                setFormData({ ...formData, priceMonthly: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
            />
            <span className="text-2xs text-slate-500 mt-1 block">
              Format: <strong>{formatRupiah(formData.priceMonthly)}</strong>
            </span>
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Keterangan Paket
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingPkg(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
