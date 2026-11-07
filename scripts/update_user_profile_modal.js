const fs = require('fs');

let code = fs.readFileSync('src/components/UserProfileModal.tsx', 'utf8');

if (!code.includes('AppImage')) {
  code = 'import { AppImage } from "./ui/AppImage";\n' + code;
  code = code.replace(
    '<Image\n                source={{\n                  uri:\n                    profile.cover_url ||\n                    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",\n                }}\n                style={styles.coverImage}\n              />',
    '<AppImage\n                source={{\n                  uri:\n                    profile.cover_url ||\n                    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",\n                }}\n                placeholderCategory="destination"\n                style={styles.coverImage}\n              />'
  );
  code = code.replace(
    '<Image source={{ uri: profile.avatar_url }} style={styles.bigAvatar} />',
    '<AppImage source={{ uri: profile.avatar_url }} placeholderCategory="avatar" style={styles.bigAvatar} />'
  );
  code = code.replace(
    '<Image source={{ uri: friend.avatar_url }} style={styles.friendGridAvatar} />',
    '<AppImage source={{ uri: friend.avatar_url }} placeholderCategory="avatar" style={styles.friendGridAvatar} />'
  );
  fs.writeFileSync('src/components/UserProfileModal.tsx', code, 'utf8');
  console.log('Updated UserProfileModal.tsx with AppImage');
}
