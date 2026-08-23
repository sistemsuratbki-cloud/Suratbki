// Standard Tariff Rates based on official SK PT. BKI (Persero) CABANG MADYA KLAS PONTIANAK
// (dalam ribuan rupiah)

export const CABANG_INFO = {
  nomorCabang: 8,
  namaCabang: 'CABANG MADYA KLAS PONTIANAK',
  unitTarif: 'Rupiah (dalam ribuan pada SK)'
};

export const INITIAL_LOCATION_TARIFFS = [
  {
    id: 'loc-1',
    no: 1,
    name: 'KEDIUK (VIA UDARA)',
    tujuan: 'KEDIUK (VIA UDARA)',
    rincian: 'KETAPANG - KEDIUK',
    rate: 3000000,
    moda: 'Udara',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-2',
    no: 2,
    name: 'KENDAWANGAN (VIA UDARA)',
    tujuan: 'KENDAWANGAN (VIA UDARA)',
    rincian: 'KETAPANG - KENDAWANGAN',
    rate: 2500000,
    moda: 'Udara',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-3',
    no: 3,
    name: 'SUNGAI PAWAN/PELABUHAN KETAPANG (VIA UDARA)',
    tujuan: 'SUNGAI PAWAN/PELABUHAN KETAPANG (VIA UDARA)',
    rincian: 'KETAPANG - SUNGAI PAWAN / PELABUHAN KETAPANG',
    rate: 2000000,
    moda: 'Udara',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-4',
    no: 4,
    name: 'SINTANG HULU (VIA UDARA)',
    tujuan: 'SINTANG HULU (VIA UDARA)',
    rincian: 'SINTANG - SINTANG HULU',
    rate: 2000000,
    moda: 'Udara',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-5',
    no: 5,
    name: 'SINTANG HULU (VIA DARAT)',
    tujuan: 'SINTANG HULU (VIA DARAT)',
    rincian: 'PONTIANAK - SINTANG HULU',
    rate: 4000000,
    moda: 'Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-6',
    no: 6,
    name: 'TELUK MELANO (VIA UDARA)',
    tujuan: 'TELUK MELANO (VIA UDARA)',
    rincian: 'KETAPANG - TELUK MELANO',
    rate: 2500000,
    moda: 'Udara',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-7',
    no: 7,
    name: 'BATU AMPAR/PADANG TIKAR',
    tujuan: 'BATU AMPAR/PADANG TIKAR',
    rincian: 'PONTIANAK - BATU AMPAR/PADANG TIKAR',
    rate: 3250000,
    moda: 'Air / Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-8',
    no: 8,
    name: 'JUNGKAT',
    tujuan: 'JUNGKAT',
    rincian: 'PONTIANAK - JUNGKAT',
    rate: 1500000,
    moda: 'Darat / Air',
    kategori: 'Dalam Kota'
  },
  {
    id: 'loc-9',
    no: 9,
    name: 'KIJING',
    tujuan: 'KIJING',
    rincian: 'PONTIANAK - KIJING',
    rate: 2500000,
    moda: 'Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-10',
    no: 10,
    name: 'KUMPAI',
    tujuan: 'KUMPAI',
    rincian: 'PONTIANAK - KUMPAI',
    rate: 1500000,
    moda: 'Darat / Air',
    kategori: 'Dalam Kota'
  },
  {
    id: 'loc-11',
    no: 11,
    name: 'MELIAU',
    tujuan: 'MELIAU',
    rincian: 'PONTIANAK - MELIAU',
    rate: 3300000,
    moda: 'Darat / Air',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-12',
    no: 12,
    name: 'MUARA JUNGKAT',
    tujuan: 'MUARA JUNGKAT',
    rincian: 'PONTIANAK - MUARA JUNGKAT',
    rate: 1750000,
    moda: 'Air / Darat',
    kategori: 'Dalam Kota'
  },
  {
    id: 'loc-13',
    no: 13,
    name: 'MUARA KUBU',
    tujuan: 'MUARA KUBU',
    rincian: 'PONTIANAK - MUARA KUBU',
    rate: 2500000,
    moda: 'Air / Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-14',
    no: 14,
    name: 'OLA OLA PINANG',
    tujuan: 'OLA OLA PINANG',
    rincian: 'PONTIANAK - OLA OLA PINANG',
    rate: 2000000,
    moda: 'Air / Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-15',
    no: 15,
    name: 'PALA DATUK',
    tujuan: 'PALA DATUK',
    rincian: 'PONTIANAK - PALA DATUK',
    rate: 2500000,
    moda: 'Darat / Air',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-16',
    no: 16,
    name: 'PULAU TEMAJO',
    tujuan: 'PULAU TEMAJO',
    rincian: 'PONTIANAK - PULAU TEMAJO',
    rate: 3000000,
    moda: 'Air',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-17',
    no: 17,
    name: 'RASAU JAYA',
    tujuan: 'RASAU JAYA',
    rincian: 'PONTIANAK - RASAU JAYA',
    rate: 1500000,
    moda: 'Darat / Air',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-18',
    no: 18,
    name: 'RIMBA RAMIN',
    tujuan: 'RIMBA RAMIN',
    rincian: 'PONTIANAK - RIMBA RAMIN',
    rate: 1500000,
    moda: 'Darat / Air',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-19',
    no: 19,
    name: 'SAMBAS',
    tujuan: 'SAMBAS',
    rincian: 'PONTIANAK - SAMBAS',
    rate: 4000000,
    moda: 'Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-20',
    no: 20,
    name: 'SANGGAU',
    tujuan: 'SANGGAU',
    rincian: 'PONTIANAK - SANGGAU',
    rate: 4000000,
    moda: 'Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-21',
    no: 21,
    name: 'SUKA LANTING',
    tujuan: 'SUKA LANTING',
    rincian: 'PONTIANAK - SUKA LANTING',
    rate: 2000000,
    moda: 'Air / Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-22',
    no: 22,
    name: 'SUNGAI DURIAN',
    tujuan: 'SUNGAI DURIAN',
    rincian: 'PONTIANAK - SUNGAI DURIAN',
    rate: 1500000,
    moda: 'Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-23',
    no: 23,
    name: 'TAYAN',
    tujuan: 'TAYAN',
    rincian: 'PONTIANAK - TAYAN',
    rate: 2700000,
    moda: 'Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-24',
    no: 24,
    name: 'JANGKANG',
    tujuan: 'JANGKANG',
    rincian: 'PONTIANAK - JANGKANG',
    rate: 2000000,
    moda: 'Darat / Air',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-25',
    no: 25,
    name: 'TELUK BATANG',
    tujuan: 'TELUK BATANG',
    rincian: 'PONTIANAK - TELUK BATANG',
    rate: 4000000,
    moda: 'Air / Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-26',
    no: 26,
    name: 'SINGKAWANG',
    tujuan: 'SINGKAWANG',
    rincian: 'PONTIANAK - SINGKAWANG',
    rate: 3000000,
    moda: 'Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-27',
    no: 27,
    name: 'SEKADAU',
    tujuan: 'SEKADAU',
    rincian: 'PONTIANAK - SEKADAU',
    rate: 4000000,
    moda: 'Darat',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-28',
    no: 28,
    name: 'LABAI',
    tujuan: 'LABAI',
    rincian: 'PONTIANAK - LABAI',
    rate: 4000000,
    moda: 'Darat / Air',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-29',
    no: 29,
    name: 'KELAMPAI (VIA UDARA)',
    tujuan: 'KELAMPAI (VIA UDARA)',
    rincian: 'KETAPANG - KELAMPAI',
    rate: 3500000,
    moda: 'Udara',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-30',
    no: 30,
    name: 'SUNGAI BULAN',
    tujuan: 'SUNGAI BULAN',
    rincian: 'PONTIANAK - SUNGAI BULAN',
    rate: 2000000,
    moda: 'Darat / Air',
    kategori: 'Luar Kota'
  },
  {
    id: 'loc-31',
    no: 31,
    name: 'WAJOK',
    tujuan: 'WAJOK',
    rincian: 'PELABUHAN DI WILAYAH PONTIANAK (SPEEDBOAT)',
    rate: 500000,
    moda: 'Air / Darat',
    kategori: 'Dalam Kota'
  },
  {
    id: 'loc-32',
    no: 32,
    name: 'BATU LAYANG',
    tujuan: 'BATU LAYANG',
    rincian: 'PELABUHAN DI WILAYAH PONTIANAK (SPEEDBOAT)',
    rate: 500000,
    moda: 'Air / Darat',
    kategori: 'Dalam Kota'
  },
  {
    id: 'loc-33',
    no: 33,
    name: 'SIANTAN',
    tujuan: 'SIANTAN',
    rincian: 'PELABUHAN DI WILAYAH PONTIANAK (SPEEDBOAT)',
    rate: 500000,
    moda: 'Air / Darat',
    kategori: 'Dalam Kota'
  },
  {
    id: 'loc-34',
    no: 34,
    name: 'SUI RENGAS',
    tujuan: 'SUI RENGAS',
    rincian: 'PELABUHAN DI WILAYAH PONTIANAK (SPEEDBOAT)',
    rate: 500000,
    moda: 'Air / Darat',
    kategori: 'Dalam Kota'
  },
  {
    id: 'loc-35',
    no: 35,
    name: 'ARANG LIMBUNG',
    tujuan: 'ARANG LIMBUNG',
    rincian: 'PELABUHAN DI WILAYAH PONTIANAK (SPEEDBOAT)',
    rate: 500000,
    moda: 'Air / Darat',
    kategori: 'Dalam Kota'
  },
  {
    id: 'loc-36',
    no: 36,
    name: 'DESA KAPOR',
    tujuan: 'DESA KAPOR',
    rincian: 'PELABUHAN DI WILAYAH PONTIANAK (SPEEDBOAT)',
    rate: 500000,
    moda: 'Air / Darat',
    kategori: 'Dalam Kota'
  },
  {
    id: 'loc-37',
    no: 37,
    name: 'SUI RAYA',
    tujuan: 'SUI RAYA',
    rincian: 'PELABUHAN DI WILAYAH PONTIANAK (SPEEDBOAT)',
    rate: 500000,
    moda: 'Air / Darat',
    kategori: 'Dalam Kota'
  }
];

export const LOCATION_TARIFFS = INITIAL_LOCATION_TARIFFS;

export const calculateHonorFee = (baseRate = 3000000, isCito = false) => {
  const numericBase = Number(baseRate) || 3000000;
  const citoSurcharge = isCito ? Math.round(numericBase * 0.5) : 0;
  const totalHonor = numericBase + citoSurcharge;

  return {
    baseRate: numericBase,
    citoSurcharge,
    totalHonor
  };
};

export const INITIAL_GRADE_TARIFFS = [
  { id: 'grd-1', grade: 'GRADE 7 C', uangHarian: 325000 },
  { id: 'grd-2', grade: 'GRADE 6 A', uangHarian: 300000 },
  { id: 'grd-3', grade: 'GRADE 5 C', uangHarian: 275000 }
];

export const findTariffByLocation = (locName, tariffList = INITIAL_LOCATION_TARIFFS) => {
  if (!locName) return null;
  const clean = String(locName).trim().toUpperCase();
  return (tariffList || []).find((t) => {
    const tName = (t.name || '').trim().toUpperCase();
    const tTujuan = (t.tujuan || '').trim().toUpperCase();
    return tName === clean || tTujuan === clean || clean.includes(tName) || (tName && clean.includes(tName));
  }) || null;
};

export const getLocationCategory = (locName, tariffList = INITIAL_LOCATION_TARIFFS) => {
  const matched = findTariffByLocation(locName, tariffList);
  if (matched && matched.kategori) {
    return matched.kategori;
  }
  // Default heuristic for Pontianak harbor areas
  const clean = String(locName || '').toUpperCase();

  // VIA DARAT → Dalam Kota, VIA UDARA → Luar Kota
  if (clean.includes('VIA DARAT')) {
    return 'Dalam Kota';
  }
  if (clean.includes('VIA UDARA')) {
    return 'Luar Kota';
  }

  if (
    clean.includes('WAJOK') ||
    clean.includes('BATU LAYANG') ||
    clean.includes('SIANTAN') ||
    clean.includes('SUI RENGAS') ||
    clean.includes('ARANG LIMBUNG') ||
    clean.includes('DESA KAPOR') ||
    clean.includes('SUI RAYA') ||
    clean.includes('JUNGKAT') ||
    clean.includes('KUMPAI') ||
    clean.includes('MUARA JUNGKAT')
  ) {
    return 'Dalam Kota';
  }
  return 'Luar Kota';
};

