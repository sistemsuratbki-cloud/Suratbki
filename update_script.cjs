const fs = require('fs'); 
const path = 'd:/3. Dokumen Pribadi Pena Pras/Pras/Project AG/Sistem Surat Tugas/src/utils/tariffData.js'; 
let content = fs.readFileSync(path, 'utf8'); 
content = content.replace(/moda:\s*'([^']+)'\s*\}/g, (match, moda) => { 
  return `moda: '${moda}',\n    kategori: 'Luar Kota'\n  }`; 
}); 
content = content.replace(/name: '([^']+)'[\s\S]*?kategori: 'Luar Kota'/g, (match, name) => { 
  const dalamKotaKeywords = ['Wajok', 'Batu Layang', 'Siantan', 'Sui Rengas', 'Arang Limbung', 'Desa Kapor', 'Sui Raya', 'Jungkat', 'Kumpai', 'Pontianak']; 
  if (dalamKotaKeywords.some(kw => name.includes(kw))) { 
    return match.replace(/kategori: 'Luar Kota'/, "kategori: 'Dalam Kota'"); 
  } 
  return match; 
}); 
fs.writeFileSync(path, content); 
console.log('Done');
