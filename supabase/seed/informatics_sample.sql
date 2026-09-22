-- Topic: Chủ đề F — Giải quyết vấn đề với sự trợ giúp của máy tính
WITH subj AS (SELECT id FROM subjects WHERE slug = 'informatics')
INSERT INTO topics (subject_id, slug, name_en, name_vi, sort_order)
SELECT id, 'topic-f-algorithms', 'Topic F — Algorithms', 'Chủ đề F — Thuật toán', 0
FROM subj
ON CONFLICT (subject_id, slug) DO NOTHING;

-- Term: Algorithm
WITH subj AS (SELECT id FROM subjects WHERE slug = 'informatics')
INSERT INTO terms (subject_id, term_en, term_vi, part_of_speech, definition_en, definition_vi)
SELECT id,
  'algorithm',
  'thuật toán',
  'noun',
  'A step-by-step procedure for solving a problem.',
  'Một tập hợp các bước có thứ tự để giải quyết một vấn đề.'
FROM subj
ON CONFLICT (subject_id, term_en) DO NOTHING;

-- Lesson: Binary Search
WITH topic AS (
  SELECT t.id AS topic_id, t.subject_id
  FROM topics t
  JOIN subjects s ON s.id = t.subject_id
  WHERE s.slug = 'informatics' AND t.slug = 'topic-f-algorithms'
),
term AS (
  SELECT id FROM terms WHERE term_en = 'algorithm'
)
INSERT INTO lessons (topic_id, subject_id, slug, title_en, title_vi, grade, published, blocks)
SELECT
  topic.topic_id,
  topic.subject_id,
  'binary-search',
  'Binary Search',
  'Tìm kiếm nhị phân',
  11,
  true,
  jsonb_build_array(
    jsonb_build_object(
      'type', 'theory',
      'content', jsonb_build_object(
        'en', 'Binary search is an efficient algorithm for finding a target value in a **sorted** array. It works by repeatedly halving the search interval.',
        'vi', 'Tìm kiếm nhị phân là thuật toán hiệu quả để tìm giá trị mục tiêu trong mảng **đã sắp xếp**. Thuật toán hoạt động bằng cách liên tục thu hẹp phạm vi tìm kiếm một nửa.'
      )
    ),
    jsonb_build_object(
      'type', 'term-ref',
      'term_id', (SELECT id::text FROM term)
    ),
    jsonb_build_object(
      'type', 'code',
      'tabs', jsonb_build_array(
        jsonb_build_object(
          'lang', 'python',
          'code', E'def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1'
        ),
        jsonb_build_object(
          'lang', 'cpp',
          'code', E'int binarySearch(vector<int>& arr, int target) {\n    int lo = 0, hi = arr.size() - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}'
        )
      )
    ),
    jsonb_build_object(
      'type', 'interactive',
      'kind', 'algorithm-sim',
      'heading', jsonb_build_object('en', 'Try Binary Search', 'vi', 'Thử tìm kiếm nhị phân'),
      'offline', true,
      'config', jsonb_build_object(
        'algorithm', 'binary-search',
        'data', jsonb_build_array(4,8,15,16,23,42),
        'target', 23
      )
    )
  )
FROM topic
ON CONFLICT (subject_id, slug) DO NOTHING;
