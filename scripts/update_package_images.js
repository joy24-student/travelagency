const fs = require('fs');

let code = fs.readFileSync('src/screens/PackageScreen.tsx', 'utf8');

if (!code.includes('AppImage')) {
  code = 'import { AppImage } from "../components/ui/AppImage";\n' + code;
  code = code.replace(
    '<Image source={{ uri: selectedPackage.hotel.image }} style={styles.hotelPreviewImg} />',
    '<AppImage source={{ uri: selectedPackage.hotel.image }} placeholderCategory="hotel" style={styles.hotelPreviewImg} />'
  );
  code = code.replace(
    '<Image source={{ uri: selectedPackage.image }} style={styles.drawerHeroImage} />',
    '<AppImage source={{ uri: selectedPackage.image }} placeholderCategory="package" style={styles.drawerHeroImage} />'
  );
  code = code.replace(
    '<Image source={{ uri: img }} style={carouselStyles.image} />',
    '<AppImage source={{ uri: img }} placeholderCategory="package" style={carouselStyles.image} />'
  );
  code = code.replace(
    '<Image source={{ uri: imgUrl }} style={zoomStyles.thumbImage} />',
    '<AppImage source={{ uri: imgUrl }} placeholderCategory="package" style={zoomStyles.thumbImage} />'
  );
  fs.writeFileSync('src/screens/PackageScreen.tsx', code, 'utf8');
  console.log('Updated PackageScreen.tsx with AppImage');
}
