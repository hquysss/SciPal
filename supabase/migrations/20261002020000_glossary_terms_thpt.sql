-- Glossary: starter terms for the rest of the THPT subjects (grade 10–12, the band with the most subjects).
-- Re-running is safe (one term per subject + English name).

with src (slug, term_en, term_vi, def_en, def_vi, ex_en, ex_vi) as (
  values
  -- Literature
  ('literature', 'metaphor', 'ẩn dụ', 'Calling one thing by the name of another because they are alike.', 'Gọi tên sự vật này bằng tên sự vật khác có nét tương đồng.', '"Thuyền về có nhớ bến chăng" uses metaphor.', '"Thuyền về có nhớ bến chăng" dùng phép ẩn dụ.'),
  ('literature', 'personification', 'nhân hoá', 'Giving human qualities to things or animals.', 'Gán đặc điểm của con người cho sự vật, con vật.', 'The bamboo "stands guard" over the village.', 'Cây tre "đứng canh" cho làng.'),
  ('literature', 'theme', 'chủ đề', 'The central idea a literary work is about.', 'Vấn đề trung tâm mà tác phẩm đề cập.', 'The theme of the story is love for one''s homeland.', 'Chủ đề của truyện là tình yêu quê hương.'),
  ('literature', 'narrator', 'người kể chuyện', 'The voice that tells the story.', 'Người đứng ra kể lại câu chuyện trong tác phẩm.', 'The story has a first-person narrator.', 'Truyện có người kể chuyện ở ngôi thứ nhất.'),
  ('literature', 'genre', 'thể loại', 'A category of literature, such as poetry, fiction or drama.', 'Loại hình tác phẩm, như thơ, truyện, kịch.', 'Truyện Kiều belongs to the verse-narrative genre.', 'Truyện Kiều thuộc thể loại truyện thơ.'),
  ('literature', 'argumentative essay', 'văn nghị luận', 'Writing that uses reasons and evidence to support a view.', 'Kiểu văn bản dùng lí lẽ và dẫn chứng để bảo vệ một quan điểm.', 'Write an argumentative essay on reading habits.', 'Viết bài văn nghị luận về thói quen đọc sách.'),
  -- English (foreign language 1)
  ('foreign-language-1', 'present perfect', 'thì hiện tại hoàn thành', 'A tense for past actions linked to the present: have/has + past participle.', 'Thì diễn tả hành động trong quá khứ còn liên quan hiện tại: have/has + V3.', 'I have lived here for five years.', 'Tôi đã sống ở đây được năm năm.'),
  ('foreign-language-1', 'passive voice', 'câu bị động', 'A structure where the subject receives the action: be + past participle.', 'Cấu trúc trong đó chủ ngữ chịu tác động: be + V3.', 'The bridge was built in 1990.', 'Cây cầu được xây năm 1990.'),
  ('foreign-language-1', 'relative clause', 'mệnh đề quan hệ', 'A clause beginning with who, which or that that describes a noun.', 'Mệnh đề bắt đầu bằng who, which, that để bổ nghĩa cho danh từ.', 'The girl who sits next to me is Lan.', 'Cô gái ngồi cạnh tôi là Lan.'),
  ('foreign-language-1', 'conditional sentence', 'câu điều kiện', 'A sentence with if that says what happens under a condition.', 'Câu có if, nêu điều xảy ra khi có một điều kiện.', 'If it rains, we will stay home.', 'Nếu trời mưa, chúng tôi sẽ ở nhà.'),
  ('foreign-language-1', 'reported speech', 'câu tường thuật', 'Telling what someone said without quoting them exactly.', 'Thuật lại lời người khác nói, không trích nguyên văn.', 'She said that she was tired.', 'Cô ấy nói rằng cô ấy mệt.'),
  ('foreign-language-1', 'phrasal verb', 'cụm động từ', 'A verb plus a particle with its own meaning.', 'Động từ kết hợp với giới từ/trạng từ tạo nghĩa mới.', 'Please turn off the lights.', 'Hãy tắt đèn.'),
  -- Foreign language 2
  ('foreign-language-2', 'pronunciation', 'phát âm', 'The way the sounds of a word are spoken.', 'Cách đọc các âm của một từ.', 'Practise the pronunciation of new words every day.', 'Luyện phát âm từ mới mỗi ngày.'),
  ('foreign-language-2', 'vocabulary', 'từ vựng', 'The words of a language that a person knows or uses.', 'Các từ của một ngôn ngữ mà người học biết hoặc dùng.', 'Flashcards help you learn vocabulary.', 'Thẻ ghi nhớ giúp em học từ vựng.'),
  ('foreign-language-2', 'greeting', 'lời chào', 'Words used when meeting someone.', 'Lời nói dùng khi gặp ai đó.', '"Bonjour" is a French greeting.', '"Bonjour" là lời chào trong tiếng Pháp.'),
  ('foreign-language-2', 'conjugation', 'chia động từ', 'Changing a verb''s form to match person and tense.', 'Biến đổi dạng động từ theo ngôi và thì.', 'Learn the conjugation of "être".', 'Học cách chia động từ "être".'),
  ('foreign-language-2', 'alphabet', 'bảng chữ cái', 'The set of letters used to write a language.', 'Tập hợp các chữ cái dùng để viết một ngôn ngữ.', 'Japanese uses more than one alphabet.', 'Tiếng Nhật dùng nhiều hơn một bảng chữ cái.'),
  -- Economic and law education
  ('economic-law-education', 'market', 'thị trường', 'Where buyers and sellers exchange goods and services.', 'Nơi người mua và người bán trao đổi hàng hoá, dịch vụ.', 'The smartphone market is very competitive.', 'Thị trường điện thoại thông minh cạnh tranh gay gắt.'),
  ('economic-law-education', 'supply and demand', 'cung và cầu', 'How much sellers offer and buyers want; together they set prices.', 'Lượng người bán cung cấp và người mua cần; cùng quyết định giá cả.', 'When demand rises and supply stays the same, prices go up.', 'Khi cầu tăng mà cung không đổi, giá tăng.'),
  ('economic-law-education', 'inflation', 'lạm phát', 'A general rise in prices over time.', 'Sự tăng lên chung của giá cả theo thời gian.', 'Inflation makes money buy less.', 'Lạm phát khiến đồng tiền mua được ít hơn.'),
  ('economic-law-education', 'tax', 'thuế', 'Money people and businesses must pay to the state.', 'Khoản tiền cá nhân, doanh nghiệp phải nộp cho Nhà nước.', 'Value-added tax is included in the price.', 'Thuế giá trị gia tăng đã tính trong giá bán.'),
  ('economic-law-education', 'constitution', 'hiến pháp', 'The highest law of a country.', 'Đạo luật cơ bản, có hiệu lực pháp lí cao nhất của một nước.', 'Vietnam''s current constitution was adopted in 2013.', 'Hiến pháp hiện hành của Việt Nam được thông qua năm 2013.'),
  ('economic-law-education', 'citizen''s rights', 'quyền công dân', 'Freedoms and benefits the law guarantees to citizens.', 'Những quyền lợi pháp luật bảo đảm cho công dân.', 'Voting is one of a citizen''s rights.', 'Bầu cử là một quyền công dân.'),
  ('economic-law-education', 'budget', 'ngân sách', 'A plan for income and spending.', 'Kế hoạch thu và chi.', 'Make a monthly budget for pocket money.', 'Lập ngân sách tiền tiêu vặt hằng tháng.'),
  -- History
  ('history', 'revolution', 'cách mạng', 'A fundamental change in a society, often in its government.', 'Sự thay đổi căn bản của xã hội, thường là về chính quyền.', 'The August Revolution took place in 1945.', 'Cách mạng tháng Tám diễn ra năm 1945.'),
  ('history', 'dynasty', 'triều đại', 'A line of rulers from the same family.', 'Các đời vua nối tiếp thuộc cùng một dòng họ.', 'The Ly dynasty moved the capital to Thang Long.', 'Nhà Lý dời đô về Thăng Long.'),
  ('history', 'colonialism', 'chủ nghĩa thực dân', 'One country ruling and exploiting another.', 'Việc một nước thống trị và bóc lột nước khác.', 'Many nations fought against colonialism in the 20th century.', 'Nhiều dân tộc đấu tranh chống chủ nghĩa thực dân trong thế kỉ XX.'),
  ('history', 'Cold War', 'Chiến tranh lạnh', 'The rivalry between the USA and the USSR from 1947 to 1991.', 'Cuộc đối đầu giữa Mỹ và Liên Xô từ 1947 đến 1991.', 'The Berlin Wall was a symbol of the Cold War.', 'Bức tường Berlin là biểu tượng của Chiến tranh lạnh.'),
  ('history', 'primary source', 'nguồn sử liệu gốc', 'Evidence made at the time being studied.', 'Tư liệu ra đời cùng thời với sự kiện được nghiên cứu.', 'A soldier''s letter is a primary source.', 'Lá thư của một người lính là nguồn sử liệu gốc.'),
  ('history', 'renovation (Doi Moi)', 'Đổi mới', 'Vietnam''s economic reforms started in 1986.', 'Công cuộc cải cách kinh tế của Việt Nam bắt đầu từ năm 1986.', 'Doi Moi opened Vietnam to a market economy.', 'Đổi mới đưa Việt Nam sang kinh tế thị trường.'),
  -- Geography
  ('geography', 'climate', 'khí hậu', 'The usual weather of a place over many years.', 'Trạng thái thời tiết đặc trưng của một nơi qua nhiều năm.', 'Vietnam has a tropical monsoon climate.', 'Việt Nam có khí hậu nhiệt đới gió mùa.'),
  ('geography', 'monsoon', 'gió mùa', 'A seasonal wind that changes direction and brings rain.', 'Gió thổi theo mùa, đổi hướng và mang mưa.', 'The summer monsoon brings heavy rain.', 'Gió mùa mùa hạ mang mưa lớn.'),
  ('geography', 'population density', 'mật độ dân số', 'The number of people living per square kilometre.', 'Số người sống trên một kilômét vuông.', 'Ha Noi has a high population density.', 'Hà Nội có mật độ dân số cao.'),
  ('geography', 'urbanisation', 'đô thị hoá', 'The growth of towns and cities as people move there.', 'Quá trình mở rộng đô thị khi dân cư chuyển về thành phố.', 'Urbanisation is fast in the Red River Delta.', 'Đô thị hoá diễn ra nhanh ở đồng bằng sông Hồng.'),
  ('geography', 'delta', 'đồng bằng châu thổ', 'Flat land formed where a river deposits soil at its mouth.', 'Vùng đất bằng do sông bồi đắp ở cửa sông.', 'The Mekong Delta is Vietnam''s rice bowl.', 'Đồng bằng sông Cửu Long là vựa lúa của Việt Nam.'),
  ('geography', 'latitude', 'vĩ độ', 'Distance north or south of the equator, in degrees.', 'Khoảng cách tính bằng độ về phía bắc hoặc nam xích đạo.', 'Ha Noi lies at about 21° north latitude.', 'Hà Nội nằm ở khoảng vĩ độ 21° Bắc.'),
  -- Technology
  ('technology', 'technical drawing', 'bản vẽ kĩ thuật', 'A precise drawing that shows how to make an object.', 'Bản vẽ chính xác thể hiện cách chế tạo một vật.', 'Read the technical drawing before cutting the wood.', 'Đọc bản vẽ kĩ thuật trước khi cắt gỗ.'),
  ('technology', 'engine', 'động cơ', 'A machine that turns energy into motion.', 'Máy biến năng lượng thành chuyển động.', 'A motorbike has a petrol engine.', 'Xe máy có động cơ xăng.'),
  ('technology', 'circuit', 'mạch điện', 'A closed path that electric current flows through.', 'Đường khép kín cho dòng điện chạy qua.', 'A switch opens and closes the circuit.', 'Công tắc đóng ngắt mạch điện.'),
  ('technology', 'sensor', 'cảm biến', 'A device that detects a change such as light or heat.', 'Thiết bị phát hiện sự thay đổi như ánh sáng, nhiệt độ.', 'A light sensor turns the street lamp on at night.', 'Cảm biến ánh sáng bật đèn đường khi trời tối.'),
  ('technology', 'hydroponics', 'thuỷ canh', 'Growing plants in nutrient water without soil.', 'Trồng cây trong dung dịch dinh dưỡng, không dùng đất.', 'Lettuce grows well with hydroponics.', 'Rau xà lách phát triển tốt khi trồng thuỷ canh.'),
  -- Physical education
  ('physical-education', 'warm-up', 'khởi động', 'Light exercise before sport to prepare the body.', 'Vận động nhẹ trước khi tập để cơ thể sẵn sàng.', 'Always warm up for ten minutes.', 'Luôn khởi động mười phút.'),
  ('physical-education', 'endurance', 'sức bền', 'The ability to keep going for a long time.', 'Khả năng duy trì vận động trong thời gian dài.', 'Long-distance running builds endurance.', 'Chạy cự li dài giúp tăng sức bền.'),
  ('physical-education', 'stretching', 'giãn cơ', 'Exercises that lengthen the muscles.', 'Bài tập kéo dài cơ.', 'Stretching after exercise reduces soreness.', 'Giãn cơ sau khi tập giúp đỡ đau mỏi.'),
  ('physical-education', 'heart rate', 'nhịp tim', 'The number of heartbeats per minute.', 'Số lần tim đập trong một phút.', 'Check your heart rate after running.', 'Đo nhịp tim sau khi chạy.'),
  ('physical-education', 'relay race', 'chạy tiếp sức', 'A race where team members run in turns and pass a baton.', 'Cuộc đua các thành viên lần lượt chạy và trao gậy.', 'Our class won the 4 × 100 m relay race.', 'Lớp em thắng nội dung chạy tiếp sức 4 × 100 m.'),
  -- National defence
  ('national-defence', 'national defence', 'quốc phòng', 'A country''s protection of its independence and territory.', 'Công cuộc bảo vệ độc lập, chủ quyền và lãnh thổ của đất nước.', 'Every citizen has a duty in national defence.', 'Mỗi công dân đều có nghĩa vụ quốc phòng.'),
  ('national-defence', 'sovereignty', 'chủ quyền', 'Full authority of a state over its territory.', 'Quyền làm chủ hoàn toàn của quốc gia với lãnh thổ.', 'Vietnam affirms sovereignty over its seas and islands.', 'Việt Nam khẳng định chủ quyền biển đảo.'),
  ('national-defence', 'first aid', 'sơ cứu', 'Immediate help given to an injured person.', 'Sự trợ giúp ban đầu cho người bị thương.', 'Learn first aid for bleeding wounds.', 'Học cách sơ cứu vết thương chảy máu.'),
  ('national-defence', 'formation drill', 'đội ngũ', 'Moving together in ordered lines on command.', 'Cách tập hợp, di chuyển theo hàng lối theo khẩu lệnh.', 'The class practised formation drill on the yard.', 'Lớp tập đội ngũ trên sân trường.'),
  ('national-defence', 'military service', 'nghĩa vụ quân sự', 'The duty of citizens to serve in the army.', 'Nghĩa vụ phục vụ trong quân đội của công dân.', 'Young men register for military service at 17.', 'Nam thanh niên đăng kí nghĩa vụ quân sự khi đủ 17 tuổi.'),
  -- Music
  ('music', 'rhythm', 'nhịp điệu', 'The pattern of long and short sounds in music.', 'Sự lặp lại có tổ chức của âm dài ngắn trong âm nhạc.', 'Clap the rhythm of the song.', 'Vỗ tay theo nhịp điệu bài hát.'),
  ('music', 'melody', 'giai điệu', 'A sequence of notes heard as a tune.', 'Chuỗi nốt nhạc tạo thành một đường nét âm nhạc.', 'The melody is easy to sing.', 'Giai điệu bài hát dễ hát.'),
  ('music', 'tempo', 'nhịp độ', 'How fast or slow music is played.', 'Độ nhanh hay chậm khi trình bày bản nhạc.', 'Allegro means a fast tempo.', 'Allegro nghĩa là nhịp độ nhanh.'),
  ('music', 'scale', 'gam', 'A set of notes in order of pitch.', 'Dãy nốt nhạc sắp xếp theo cao độ.', 'C major scale has no sharps or flats.', 'Gam Đô trưởng không có dấu thăng giáng.'),
  ('music', 'folk song', 'dân ca', 'A traditional song passed down among ordinary people.', 'Bài hát truyền thống lưu truyền trong dân gian.', 'Quan ho is a folk song of Bac Ninh.', 'Quan họ là dân ca Bắc Ninh.'),
  -- Fine arts
  ('fine-arts', 'composition', 'bố cục', 'How the parts of an artwork are arranged.', 'Cách sắp xếp các thành phần trong tác phẩm.', 'The composition puts the tree on the left.', 'Bố cục đặt cái cây ở bên trái.'),
  ('fine-arts', 'perspective', 'phối cảnh', 'Showing depth so near things look bigger than far ones.', 'Cách thể hiện chiều sâu, vật gần to hơn vật xa.', 'Use perspective to draw a long road.', 'Dùng luật phối cảnh để vẽ con đường dài.'),
  ('fine-arts', 'complementary colours', 'màu bổ túc', 'Pairs of colours opposite each other on the colour wheel.', 'Các cặp màu đối nhau trên vòng màu.', 'Red and green are complementary colours.', 'Đỏ và lục là cặp màu bổ túc.'),
  ('fine-arts', 'lacquer painting', 'tranh sơn mài', 'A Vietnamese painting technique using layers of lacquer.', 'Kĩ thuật vẽ tranh bằng nhiều lớp sơn ta của Việt Nam.', 'Lacquer painting is polished many times.', 'Tranh sơn mài được mài nhiều lần.'),
  ('fine-arts', 'sketch', 'phác thảo', 'A quick rough drawing.', 'Bản vẽ nhanh, sơ lược.', 'Make a sketch before painting.', 'Vẽ phác thảo trước khi tô màu.'),
  -- Experiential and career activities
  ('experiential-career', 'career orientation', 'hướng nghiệp', 'Help to choose a suitable job or field of study.', 'Hoạt động giúp chọn nghề hoặc ngành học phù hợp.', 'The school holds career orientation days.', 'Trường tổ chức ngày hội hướng nghiệp.'),
  ('experiential-career', 'teamwork', 'làm việc nhóm', 'Working together with others toward a shared goal.', 'Cùng nhau làm việc vì mục tiêu chung.', 'The project needs good teamwork.', 'Dự án cần làm việc nhóm tốt.'),
  ('experiential-career', 'volunteering', 'hoạt động tình nguyện', 'Doing useful work without pay.', 'Làm việc có ích mà không nhận thù lao.', 'Students went volunteering at the orphanage.', 'Học sinh đi tình nguyện ở trại trẻ.'),
  ('experiential-career', 'goal setting', 'đặt mục tiêu', 'Deciding clearly what you want to achieve and by when.', 'Xác định rõ điều muốn đạt được và thời hạn.', 'Goal setting helps you study regularly.', 'Đặt mục tiêu giúp em học đều đặn.'),
  ('experiential-career', 'soft skills', 'kĩ năng mềm', 'Personal skills such as communication and time management.', 'Kĩ năng cá nhân như giao tiếp, quản lí thời gian.', 'Employers value soft skills.', 'Nhà tuyển dụng coi trọng kĩ năng mềm.'),
  -- Local education
  ('local-education', 'cultural heritage', 'di sản văn hoá', 'Traditions, places and objects handed down from the past.', 'Giá trị văn hoá, di tích, hiện vật được lưu truyền.', 'Hue Citadel is a cultural heritage site.', 'Kinh thành Huế là di sản văn hoá.'),
  ('local-education', 'traditional craft village', 'làng nghề truyền thống', 'A village known for a craft passed down for generations.', 'Làng có nghề thủ công lưu truyền qua nhiều đời.', 'Bat Trang is a traditional pottery village.', 'Bát Tràng là làng gốm truyền thống.'),
  ('local-education', 'festival', 'lễ hội', 'A celebration held by a community, often yearly.', 'Hoạt động kỉ niệm của cộng đồng, thường tổ chức hằng năm.', 'The Hung Kings Festival is on the 10th of the 3rd lunar month.', 'Giỗ Tổ Hùng Vương vào mùng 10 tháng 3 âm lịch.'),
  ('local-education', 'specialty product', 'đặc sản', 'A product a place is famous for.', 'Sản phẩm nổi tiếng của một địa phương.', 'Phu Quoc fish sauce is a local specialty.', 'Nước mắm Phú Quốc là đặc sản địa phương.'),
  -- Ethnic language
  ('ethnic-language', 'ethnic minority', 'dân tộc thiểu số', 'A group whose population is smaller than the majority group.', 'Dân tộc có số dân ít hơn dân tộc đa số.', 'Vietnam has 53 ethnic minorities.', 'Việt Nam có 53 dân tộc thiểu số.'),
  ('ethnic-language', 'mother tongue', 'tiếng mẹ đẻ', 'The first language a person learns at home.', 'Ngôn ngữ đầu tiên một người học được từ gia đình.', 'Her mother tongue is Tay.', 'Tiếng mẹ đẻ của bạn ấy là tiếng Tày.'),
  ('ethnic-language', 'bilingual', 'song ngữ', 'Using or able to use two languages.', 'Sử dụng hoặc thông thạo hai ngôn ngữ.', 'The school runs bilingual classes.', 'Trường tổ chức các lớp song ngữ.'),
  ('ethnic-language', 'writing system', 'chữ viết', 'The set of symbols used to write a language.', 'Hệ thống kí hiệu dùng để ghi một ngôn ngữ.', 'The Cham language has its own writing system.', 'Tiếng Chăm có chữ viết riêng.')
)
insert into public.terms (subject_id, term_en, term_vi, part_of_speech, definition_en, definition_vi, example_en, example_vi)
select s.id, src.term_en, src.term_vi, 'noun', src.def_en, src.def_vi, src.ex_en, src.ex_vi
from src join public.subjects s on s.slug = src.slug
on conflict (subject_id, lower(term_en)) do nothing;
