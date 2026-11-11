const fs = require('fs');

let code = fs.readFileSync('src/screens/RecommendedToursScreen.tsx', 'utf8');

if (!code.includes('AppImage')) {
  code = 'import { AppImage } from "../components/ui/AppImage";\n' + code;
  code = code.replace(
    '<Image source={{ uri: tour.guide.avatar }} style={styles.guideAvatar} />',
    '<AppImage source={{ uri: tour.guide.avatar }} placeholderCategory="avatar" style={styles.guideAvatar} />'
  );
  code = code.replace(
    '<Image source={{ uri: digitalPass.guide.avatar }} style={styles.ticketGuideAvatar} />',
    '<AppImage source={{ uri: digitalPass.guide.avatar }} placeholderCategory="avatar" style={styles.ticketGuideAvatar} />'
  );
  code = code.replace(
    '<Image source={{ uri: img }} style={tourCarouselStyles.image} />',
    '<AppImage source={{ uri: img }} placeholderCategory="destination" style={tourCarouselStyles.image} />'
  );
  code = code.replace(
    '<Image source={{ uri: imgUrl }} style={zoomStyles.thumbImage} />',
    '<AppImage source={{ uri: imgUrl }} placeholderCategory="destination" style={zoomStyles.thumbImage} />'
  );
  fs.writeFileSync('src/screens/RecommendedToursScreen.tsx', code, 'utf8');
  console.log('Updated RecommendedToursScreen.tsx with AppImage');
}
