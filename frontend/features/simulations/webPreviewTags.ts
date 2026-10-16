type Bilingual = { en: string; vi: string };

/** One line on what each tag the lessons use does, shown in the step note; other tags get a general line. */
export const TAG_NOTES: Record<string, Bilingual> = {
  h1: { en: 'a top-level heading', vi: 'tiêu đề lớn nhất của trang' },
  h2: { en: 'a second-level heading', vi: 'tiêu đề cấp 2' },
  h3: { en: 'a third-level heading', vi: 'tiêu đề cấp 3' },
  h4: { en: 'a fourth-level heading', vi: 'tiêu đề cấp 4' },
  h5: { en: 'a fifth-level heading', vi: 'tiêu đề cấp 5' },
  h6: { en: 'a sixth-level heading', vi: 'tiêu đề cấp 6' },
  p: { en: 'a paragraph', vi: 'một đoạn văn' },
  a: { en: 'a link to another page', vi: 'liên kết sang trang khác' },
  img: { en: 'a picture', vi: 'một hình ảnh' },
  ul: { en: 'a bulleted list', vi: 'danh sách không đánh số' },
  ol: { en: 'a numbered list', vi: 'danh sách đánh số' },
  li: { en: 'one item of a list', vi: 'một mục của danh sách' },
  table: { en: 'a table', vi: 'một bảng' },
  tr: { en: 'a table row', vi: 'một hàng của bảng' },
  td: { en: 'a table cell', vi: 'một ô của bảng' },
  th: { en: 'a table heading cell', vi: 'một ô tiêu đề của bảng' },
  form: { en: 'a form that collects input', vi: 'biểu mẫu để nhập dữ liệu' },
  input: { en: 'a field to type or choose in', vi: 'ô để gõ hoặc chọn dữ liệu' },
  label: { en: 'the caption of a form field', vi: 'nhãn của một ô nhập' },
  button: { en: 'a button', vi: 'một nút bấm' },
  iframe: { en: 'another page shown inside this one', vi: 'khung hiện một trang khác bên trong trang này' },
  video: { en: 'a video', vi: 'một video' },
  audio: { en: 'a sound clip', vi: 'một đoạn âm thanh' },
  header: { en: 'the top part of the page', vi: 'phần đầu trang' },
  nav: { en: 'the navigation bar', vi: 'thanh điều hướng' },
  main: { en: 'the main content', vi: 'nội dung chính của trang' },
  footer: { en: 'the bottom part of the page', vi: 'phần chân trang' },
  div: { en: 'a block that groups content', vi: 'một khối để gom nội dung' },
  span: { en: 'a piece of text inside a line', vi: 'một đoạn chữ trong dòng' },
};

/** The first tag on an HTML line, lower-case, or undefined. */
export const firstTag = (line: string): string | undefined => /<([A-Za-z][\w-]*)/.exec(line)?.[1]?.toLowerCase();
