import { useState } from 'react';
import { Carousel } from '@/components/ui/Carousel';
import { PhotoUploader } from '@/components/ui/PhotoUploader';
import { PHOTO_RULES } from '@/constants/options';
import { Row, Section } from './Section';

// Test photos from the team mockup (client/public/demo). Removed with the demo data later.
const PHOTOS = [
  {
    src: '/demo/bangkung.jpg',
    alt: 'Bamboo boardwalk through mangroves',
    caption: 'Lookout at the river mouth',
  },
  {
    src: '/demo/fiona.jpg',
    alt: 'Wooden farm cottage among trees',
    caption: "Fiona's Farm, Magalang",
  },
  { src: '/demo/canyon.jpg', alt: 'Mossy canyon walls', caption: 'Sapang Uwak Lahar Canyons' },
  { src: '/demo/dara.jpg', alt: 'Waterfall in a forest', caption: 'Dara Falls, Porac' },
];

export function MediaSection() {
  const [nomination, setNomination] = useState([]);
  const [primary, setPrimary] = useState(null);
  const [review, setReview] = useState([]);
  return (
    <Section
      id="media"
      title="Photos"
      note="Upload rules: JPG or PNG, up to 5 MB each; 1 to 5 per nomination, up to 3 per review."
    >
      <Row label="Carousel">
        <Carousel images={PHOTOS} className="w-full max-w-3xl" />
      </Row>
      <Row label="Empty carousel">
        <Carousel images={[]} className="w-full max-w-md" />
      </Row>
      <Row label="Nomination photos">
        <PhotoUploader
          value={nomination}
          onChange={setNomination}
          max={PHOTO_RULES.nomination.max}
          primaryId={primary}
          onPrimaryChange={setPrimary}
          hint="Add at least one photo you took yourself."
        />
      </Row>
      <Row label="Review photos">
        <PhotoUploader
          value={review}
          onChange={setReview}
          max={PHOTO_RULES.review.max}
          hint="Optional."
        />
      </Row>
    </Section>
  );
}
