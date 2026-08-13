// Tariff rates for BKI Pontianak ports & shipyards in West Kalimantan region
export const LOCATION_TARIFFS = [
  { id: 'loc-1', name: 'Pelabuhan Dwikora Pontianak', rate: 3500000 },
  { id: 'loc-2', name: 'Pelabuhan Kijing (Mempawah)', rate: 4000000 },
  { id: 'loc-3', name: 'Pelabuhan Sintete (Sambas)', rate: 4200000 },
  { id: 'loc-4', name: 'Pelabuhan Ketapang / Sukabangun', rate: 4500000 },
  { id: 'loc-5', name: 'Galangan Kapal Sungai Kapuas Pontianak', rate: 3200000 },
  { id: 'loc-6', name: 'Pelabuhan Muara Kubu / Teluk Batang', rate: 4800000 }
];

export const calculateHonorFee = (baseRate = 3500000, isCito = false) => {
  const numericBase = Number(baseRate) || 3500000;
  const citoSurcharge = isCito ? Math.round(numericBase * 0.5) : 0;
  const totalHonor = numericBase + citoSurcharge;

  return {
    baseRate: numericBase,
    citoSurcharge,
    totalHonor
  };
};
