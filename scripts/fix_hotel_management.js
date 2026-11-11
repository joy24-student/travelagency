const fs = require('fs');
let code = fs.readFileSync('src/screens/admin/HotelManagementScreen.tsx', 'utf8');
code = code.replace('width: (width - 44) / 3,', 'width: "31%",');
fs.writeFileSync('src/screens/admin/HotelManagementScreen.tsx', code, 'utf8');
console.log('Fixed width in HotelManagementScreen.tsx');
