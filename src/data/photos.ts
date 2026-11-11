// Photos from Dmitriy's public Instagram (@zz_dmitriy_zz).
// They are small (Instagram only served 640px previews), so treat them as
// tiles, frames and textures — never as full-bleed backgrounds without a
// heavy treatment. Use them through Astro's <Image /> / getImage().

import type { ImageMetadata } from "astro";
import danceDip from "../assets/photos/dance-dip.jpg";
import danceHall from "../assets/photos/dance-hall.jpg";
import dancePink from "../assets/photos/dance-pink.jpg";
import danceSmile from "../assets/photos/dance-smile.jpg";
import partyWide from "../assets/photos/party-wide.jpg";
import portrait from "../assets/photos/portrait.jpg";
import teacherCake from "../assets/photos/teacher-cake.jpg";
import teamMedals from "../assets/photos/team-medals.jpg";

export interface Photo {
  src: ImageMetadata;
  /** Alt text in Russian, ready to use. */
  alt: string;
  /** What is in the frame and how it can be used (for designers). */
  about: string;
}

export const photos = {
  portrait: {
    src: portrait,
    alt: "Дмитрий Карпов — портрет в тёмной рубашке на фоне огней",
    about:
      "320×320, clean chest-up portrait, warm red/amber club lights, dark navy shirt. The only clean portrait — keep it small (avatar, badge, about block).",
  },
  danceSmile: {
    src: danceSmile,
    alt: "Дмитрий танцует бачату с партнёршей и улыбается",
    about:
      "640×640, Dmitriy (right) leading a smiling partner, dark club, teal and orange light. The warmest, most 'bachata' shot — best hero/feature photo.",
  },
  danceHall: {
    src: danceHall,
    alt: "Дмитрий в белой рубашке ведёт танец в зале, полном пар",
    about:
      "640×640, wide hall with many dancers, Dmitriy in a white shirt mid-move with an arm raised, warm golden light. Shows energy and a crowd.",
  },
  dancePink: {
    src: dancePink,
    alt: "Пара танцует бачату в розово-фиолетовом свете",
    about:
      "360×640 vertical, couple in a close hold, strong pink/violet stage light, red trousers. Moody, great with duotone or as a tall tile.",
  },
  danceDip: {
    src: danceDip,
    alt: "Дмитрий делает поддержку — партнёрша в глубоком наклоне",
    about:
      "360×640 vertical, a dramatic dip on a wooden floor in a big hall, blue-violet light. Good proof for 'lifts and dips' (поддержки).",
  },
  partyWide: {
    src: partyWide,
    alt: "Дмитрий танцует на вечеринке среди других пар",
    about:
      "640×361 landscape, party floor at night, a watermark in the corners — crop the bottom 12% or use small.",
  },
  teamMedals: {
    src: teamMedals,
    alt: "Дмитрий с партнёрами по танцам, с дипломами и медалями",
    about:
      "640×480 landscape, four dancers posing with diplomas and medals against a brick wall. Friendly 'competition day' shot.",
  },
  teacherCake: {
    src: teacherCake,
    alt: "Торт с силуэтами танцующих пар и кубком «Bachata Teacher»",
    about:
      "360×640 vertical, a white drip cake with dancing-couple silhouettes and a 'Bachata Teacher' trophy topper. A charming detail, not a main visual.",
  },
} as const satisfies Record<string, Photo>;

export type PhotoId = keyof typeof photos;
