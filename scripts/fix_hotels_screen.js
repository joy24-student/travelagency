const fs = require('fs');

const file = 'src/screens/HotelsHomesScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix specs & policies in hotelComparisonItems
const oldComparisonBlock = `  const hotelComparisonItems: ComparisonItem[] = useMemo(() => {
    return selectedCompareHotels.map((h) => ({
      id: h.id,
      title: h.name,
      subtitle: \`\${h.location} • \${h.propertyType}\`,
      price: h.pricePerNight,
      priceUnit: "/রাত",
      rating: h.rating,
      reviewsCount: h.reviewsCount,
      specs: [
        { label: "ধরণ", value: h.propertyType },
        { label: "অতিথি", value: \`\${h.maxGuests} জন\` },
        { label: "বেডরুম", value: \`\${h.bedrooms}টি\` },
        { label: "বাথরুম", value: \`\${h.bathrooms}টি\` },
      ],
      features: h.amenities || [],
      policies: [h.freeCancellation ? "ফ্রি বাতিলকরণ সুবিধা" : "বাতিলকরণ প্রযোজ্য নয়"],
    }));
  }, [selectedCompareHotels]);`;

const newComparisonBlock = `  const hotelComparisonItems: ComparisonItem[] = useMemo(() => {
    return selectedCompareHotels.map((h) => ({
      id: h.id,
      title: h.name,
      subtitle: \`\${h.location} • \${h.propertyType}\`,
      price: h.pricePerNight,
      priceUnit: "/রাত",
      rating: h.rating,
      reviewsCount: h.reviewsCount,
      specs: [
        { label: "ধরণ", value: h.propertyType },
        { label: "অতিথি", value: \`\${h.specs?.guests || 2} জন\` },
        { label: "বেডরুম", value: \`\${h.specs?.bedrooms || 1}টি\` },
        { label: "বাথরুম", value: \`\${h.specs?.baths || 1}টি\` },
      ],
      features: h.amenities || [],
      policies: [h.is_free_cancellation ? "ফ্রি বাতিলকরণ সুবিধা" : "বাতিলকরণ প্রযোজ্য নয়"],
    }));
  }, [selectedCompareHotels]);`;

content = content.replace(oldComparisonBlock.replace(/\r?\n/g, '\r\n'), newComparisonBlock)
  || content.replace(oldComparisonBlock.replace(/\r?\n/g, '\n'), newComparisonBlock);

// 2. Remove pagination block from top
const paginationBlock = `  // Progressive list pagination
  const [pageLimit, setPageLimit] = useState(8);
  const pagedRentals = useMemo(() => {
    return filteredRentals.slice(0, pageLimit);
  }, [filteredRentals, pageLimit]);

  const handleEndReached = useCallback(() => {
    if (pageLimit < filteredRentals.length) {
      setPageLimit((prev) => Math.min(prev + 6, filteredRentals.length));
    }
  }, [pageLimit, filteredRentals.length]);`;

content = content.replace(paginationBlock.replace(/\r?\n/g, '\r\n'), '')
  || content.replace(paginationBlock.replace(/\r?\n/g, '\n'), '');

// 3. Insert pagination block after filteredRentals
const targetInsert = `    freeCancellationOnly,\n  ]);`;
const targetInsertCRLF = `    freeCancellationOnly,\r\n  ]);`;

const insertion = `\n\n  // Progressive list pagination
  const [pageLimit, setPageLimit] = useState(8);
  const pagedRentals = useMemo(() => {
    return filteredRentals.slice(0, pageLimit);
  }, [filteredRentals, pageLimit]);

  const handleEndReached = useCallback(() => {
    if (pageLimit < filteredRentals.length) {
      setPageLimit((prev) => Math.min(prev + 6, filteredRentals.length));
    }
  }, [pageLimit, filteredRentals.length]);`;

if (content.includes(targetInsertCRLF)) {
  content = content.replace(targetInsertCRLF, targetInsertCRLF + insertion.replace(/\n/g, '\r\n'));
} else if (content.includes(targetInsert)) {
  content = content.replace(targetInsert, targetInsert + insertion);
}

// 4. Fix onSelect={(item: any) =>
content = content.replace('onSelect={(item) =>', 'onSelect={(item: any) =>');

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated HotelsHomesScreen.tsx');
