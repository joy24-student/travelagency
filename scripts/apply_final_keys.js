const fs = require('fs');
const path = require('path');

function patchFile(filePath, transforms) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { target, replacement, label } of transforms) {
    const normContent = content.replace(/\r\n/g, '\n');
    const normTarget = target.replace(/\r\n/g, '\n');
    if (!normContent.includes(normTarget)) {
      console.error(`[FAIL] in ${path.basename(filePath)}: Could not find target for "${label}"`);
      process.exit(1);
    }
    const normReplacement = replacement.replace(/\r\n/g, '\n');
    content = normContent.replace(normTarget, normReplacement);
    console.log(`[OK] ${path.basename(filePath)}: ${label}`);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. CarRentalsScreen.tsx
const carPath = path.resolve(__dirname, '../src/screens/CarRentalsScreen.tsx');
patchFile(carPath, [
  {
    target: `          {PERKS.map((perk, i) => (
            <View key={i} style={styles.perkItem}>`,
    replacement: `          {PERKS.map((perk, i) => (
            <View key={perk.text || \`perk-\${i}\`} style={styles.perkItem}>`,
    label: "Stable key perks in CarRentalsScreen",
  },
  {
    target: `                    {vehicle.features.map((feat: string, idx: number) => (
                      <View key={idx} style={styles.featureItem}>`,
    replacement: `                    {vehicle.features.map((feat: string, idx: number) => (
                      <View key={\`feat-\${feat}-\${idx}\`} style={styles.featureItem}>`,
    label: "Stable key features in CarRentalsScreen",
  },
]);

// 2. ExploreScreen.tsx
const explorePath = path.resolve(__dirname, '../src/screens/ExploreScreen.tsx');
patchFile(explorePath, [
  {
    target: `              {selectedDest.gallery.map((img: string, i: number) => (
                <Image key={i} source={{ uri: img }} style={s.galleryImg} />
              ))}`,
    replacement: `              {selectedDest.gallery.map((img: string, i: number) => (
                <Image key={\`gallery-\${img}-\${i}\`} source={{ uri: img }} style={s.galleryImg} />
              ))}`,
    label: "Stable key gallery in ExploreScreen",
  },
  {
    target: `                {budgetData.breakdown?.map((b: any, i: number) => (
                  <View key={i} style={s.budgetRow}>`,
    replacement: `                {budgetData.breakdown?.map((b: any, i: number) => (
                  <View key={\`budget-\${b.category || i}\`} style={s.budgetRow}>`,
    label: "Stable key budget breakdown in ExploreScreen",
  },
  {
    target: `              <SectionBlock title="Saving Tips">
                {budgetData.savingTips?.map((t: string, i: number) => (
                  <Text key={i} style={s.bulletItem}>`,
    replacement: `              <SectionBlock title="Saving Tips">
                {budgetData.savingTips?.map((t: string, i: number) => (
                  <Text key={\`tip-\${i}\`} style={s.bulletItem}>`,
    label: "Stable key saving tips in ExploreScreen",
  },
  {
    target: `              <SectionBlock title="What People Love">
                {reviewData.topPraises?.map((p: string, i: number) => (
                  <Text key={i} style={[s.bulletItem, { color: "#10b981" }]}>`,
    replacement: `              <SectionBlock title="What People Love">
                {reviewData.topPraises?.map((p: string, i: number) => (
                  <Text key={\`praise-\${i}\`} style={[s.bulletItem, { color: "#10b981" }]}>`,
    label: "Stable key praises in ExploreScreen",
  },
  {
    target: `              <SectionBlock title="Common Complaints">
                {reviewData.topComplaints?.map((c: string, i: number) => (
                  <Text key={i} style={[s.bulletItem, { color: "#ef4444" }]}>`,
    replacement: `              <SectionBlock title="Common Complaints">
                {reviewData.topComplaints?.map((c: string, i: number) => (
                  <Text key={\`complaint-\${i}\`} style={[s.bulletItem, { color: "#ef4444" }]}>`,
    label: "Stable key complaints in ExploreScreen",
  },
  {
    target: `              <SectionBlock title="🚨 Common Scams to Avoid">
                {scamData.length ? (
                  scamData.map((sc: string, i: number) => (
                    <Text key={i} style={s.bulletItem}>`,
    replacement: `              <SectionBlock title="🚨 Common Scams to Avoid">
                {scamData.length ? (
                  scamData.map((sc: string, i: number) => (
                    <Text key={\`scam-\${i}\`} style={s.bulletItem}>`,
    label: "Stable key scams in ExploreScreen",
  },
]);

// 3. FlightsScreen.tsx
const flightPath = path.resolve(__dirname, '../src/screens/FlightsScreen.tsx');
patchFile(flightPath, [
  {
    target: `                  <Pressable
                    key={idx}
                    style={[styles.calendarDayCell, isSelected && styles.calendarDayCellActive]}`,
    replacement: `                  <Pressable
                    key={fullFormatted || \`cal-day-\${idx}\`}
                    style={[styles.calendarDayCell, isSelected && styles.calendarDayCellActive]}`,
    label: "Stable key calendarDayCell in FlightsScreen",
  },
]);

// 4. RecommendedToursScreen.tsx
const toursPath = path.resolve(__dirname, '../src/screens/RecommendedToursScreen.tsx');
patchFile(toursPath, [
  {
    target: `            {images.map((imgUrl, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <Pressable
                  key={idx}`,
    replacement: `            {images.map((imgUrl, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <Pressable
                  key={\`tour-thumb-\${imgUrl}-\${idx}\`}`,
    label: "Stable key tour-thumb in RecommendedToursScreen",
  },
  {
    target: `        {images.map((img, i) => (
          <Pressable key={i} onPress={() => onOpenZoom(i)} style={tourCarouselStyles.slide}>`,
    replacement: `        {images.map((img, i) => (
          <Pressable key={\`slide-\${img}-\${i}\`} onPress={() => onOpenZoom(i)} style={tourCarouselStyles.slide}>`,
    label: "Stable key slide in RecommendedToursScreen",
  },
  {
    target: `                        {digitalPass.inclusions.slice(0, 3).map((item, i) => (
                          <View key={i} style={styles.passInclusionChip}>`,
    replacement: `                        {digitalPass.inclusions.slice(0, 3).map((item, i) => (
                          <View key={\`pass-inc-\${item}-\${i}\`} style={styles.passInclusionChip}>`,
    label: "Stable key passInclusionChip in RecommendedToursScreen",
  },
]);

// 5. TrainsScreen.tsx
const trainsPath = path.resolve(__dirname, '../src/screens/TrainsScreen.tsx');
patchFile(trainsPath, [
  {
    target: `                                    {cItem.classMeta.amenities.map((am, i) => (
                                      <View key={i} style={styles.amenityTag}>`,
    replacement: `                                    {cItem.classMeta.amenities.map((am, i) => (
                                      <View key={\`amenity-\${am}-\${i}\`} style={styles.amenityTag}>`,
    label: "Stable key amenity in TrainsScreen",
  },
  {
    target: `              {upcomingCalendarDays.map((item, idx) => {
                const isSelected =
                  !item.isPast && travelDate.toDateString() === item.date.toDateString();

                return (
                  <Pressable
                    key={idx}`,
    replacement: `              {upcomingCalendarDays.map((item, idx) => {
                const isSelected =
                  !item.isPast && travelDate.toDateString() === item.date.toDateString();

                return (
                  <Pressable
                    key={item.date.toISOString() || \`cal-\${idx}\`}`,
    label: "Stable key calendarDayCard in TrainsScreen",
  },
]);

console.log("All final keys patched!");
