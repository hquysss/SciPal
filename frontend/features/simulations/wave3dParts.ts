import type { Bilingual } from './types';

export type WavePart = 'drive' | 'source' | 'float' | 'absorber';

/** The labelled parts of the ripple tank; picking one focuses the camera and explains it. */
export const WAVE_PARTS: Record<WavePart, { readonly name: Bilingual; readonly about: Bilingual }> = {
  drive: {
    name: { vi: 'Cơ cấu chuyển động', en: 'Drive mechanism' },
    about: {
      vi: 'Motor quay bánh xe qua dây đai. Chốt lệch tâm trên bánh xe trượt trong khung culit, biến chuyển động quay thành dao động lên xuống. Mỗi vòng quay tạo một bước sóng, nên tần số quay chính là tần số f của sóng.',
      en: 'A motor turns the wheel through a belt. The off-centre pin slides in a slotted yoke, turning rotation into up-and-down motion. Each turn makes one wavelength, so the turning frequency is the wave frequency f.',
    },
  },
  source: {
    name: { vi: 'Vật tạo sóng', en: 'Wave source' },
    about: {
      vi: 'Thanh nhúng dao động lên xuống trên mặt nước và kéo theo các phần tử nước bên cạnh. Biên độ A bằng khoảng cách từ chốt tới tâm bánh xe.',
      en: 'The dipper moves up and down at the surface and drags the neighbouring water with it. The amplitude A equals the distance from the pin to the wheel centre.',
    },
  },
  float: {
    name: { vi: 'Miếng xốp nhỏ', en: 'Small float' },
    about: {
      vi: 'Miếng xốp chỉ dao động lên xuống quanh vị trí cân bằng, không trôi theo sóng. Sóng truyền trạng thái dao động và năng lượng, không truyền các phần tử nước đi theo.',
      en: 'The float only bobs up and down about its rest position; it does not drift with the wave. A wave carries the state of oscillation and energy, not the water itself.',
    },
  },
  absorber: {
    name: { vi: 'Tấm chống phản xạ', en: 'Anti-reflection slope' },
    about: {
      vi: 'Tấm xốp đặt nghiêng ở cuối máng hấp thụ dần năng lượng sóng, nên sóng không dội ngược lại chồng lên sóng tới.',
      en: 'The sloping foam at the far end soaks up the wave’s energy gradually, so nothing reflects back over the incoming wave.',
    },
  },
};
