import React, { useState, useEffect } from 'react';
import { X, Save, TrendingUp } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ModalPortal } from './ModalPortal';

export const GradeTariffModal = ({ isOpen, onClose, editItem = null }) => {
  const { addGradeTariff, updateGradeTariff } = useData();

  const [formData, setFormData] = useState({
    grade: '',
    uangHarian: 0
  });

  useEffect(() => {
    if (editItem) {
      setFormData({ ...editItem });
    } else {
      setFormData({
        grade: '',
        uangHarian: 0
      });
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.grade) {
      alert('Mohon isi nama Grade!');
      return;
    }

    if (editItem) {
      updateGradeTariff(editItem.id, formData);
    } else {
      addGradeTariff(formData);
    }
    onClose();
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="var(--accent-primary)" />
              <h3 className="modal-title">{editItem ? 'Ubah Grade & Uang Harian' : 'Tambah Grade Baru'}</h3>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Grade / Pangkat *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="Contoh: GRADE 6 A"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Uang Harian (Rp) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="form-input"
                  value={formData.uangHarian}
                  onChange={(e) => setFormData({ ...formData, uangHarian: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="Contoh: 500000"
                  required
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={16} />
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
