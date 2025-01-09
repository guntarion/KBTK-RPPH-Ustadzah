// EdukasiKBTK.js
class Edukasi {
  constructor() {
    this.anthropic = new Anthropic();

    this.CONFIGS = {
      RPPH: {
        name: 'RPPH',
        requiredTags: ['input_RPPH'],
        generatorMethod: 'generateRPPH',
        outputConfig: {
          headerText: 'RPPH - KBTK Al Muhajirin',
          headerEmoji: '📍📤',
          xmlTags: 'rpph',
        },
      },

      ACTIVITY_DETAIL: {
        name: 'Activity Detail',
        requiredTags: ['input_Activity_Detail'],
        generatorMethod: 'generateActivityDetail',
        outputConfig: {
          headerText: 'Detail Kegiatan - KBTK Al Muhajirin',
          headerEmoji: '📋',
          xmlTags: 'activity_detail',
        },
      },

      ASSESSMENT_GUIDE: {
        name: 'Assessment Guide',
        requiredTags: ['input_Assessment'],
        generatorMethod: 'generateAssessmentGuide',
        outputConfig: {
          headerText: 'Panduan Penilaian - KBTK Al Muhajirin',
          headerEmoji: '📊',
          xmlTags: 'assessment_guide',
        },
      },

      STORY: {
        name: 'Story',
        requiredTags: ['topik_cerita'],
        generatorMethod: 'generateStory',
        outputConfig: {
          headerText: 'Cerita Edukatif - KBTK Al Muhajirin',
          headerEmoji: '📖',
          xmlTags: 'story',
        },
      },
    };

    /**
     * Mapping object to link tag names with extraction methods
     * Some tags need special extraction methods
     */
    this.EXTRACT_METHOD_MAPPING = {
      input_RPPH: 'extractRpphInput',
      input_Activity_Detail: 'extractActivityDetailInput',
      input_Assessment: 'extractAssessmentInput',
      topik_cerita: 'extractStoryInput',
    };
  }

  async process(operationType, progressCallback) {
    let tokenStats = null;
    const config = this.CONFIGS[operationType];

    console.log('Starting process for operation:', operationType);
    console.log('Config:', config);

    const doc = DocumentApp.getActiveDocument();
    const body = doc.getBody();
    const extractInput = new ExtractInput();

    try {
      // Update progress - Initialization
      progressCallback(10, 'Initializing process...');

      // Validate and extract all required tags
      const inputs = {};
      const tagElements = {};
      let lastInputEndElement = null;

      console.log('Required tags to process:', config.requiredTags);

      // Update progress - Start tag processing
      progressCallback(20, 'Validating input tags...');

      // Calculate progress step for each tag
      const progressPerTag = 20 / config.requiredTags.length; // 20% total for tag processing
      let currentProgress = 20;

      for (const tag of config.requiredTags) {
        console.log(`Processing tag: ${tag}`);

        const startElement = body.findText(`<${tag}>`);
        const endElement = body.findText(`</${tag}>`);

        console.log(`Found elements for ${tag}:`, {
          startFound: !!startElement,
          endFound: !!endElement,
        });

        if (!startElement || !endElement) {
          DocumentApp.getUi().alert(`Mohon tambahkan ${tag} di antara tag <${tag}> dan </${tag}>`);
          return {
            success: false,
            error: `Missing required tag: ${tag}`,
          };
        }

        // Store elements for later use
        tagElements[tag] = { start: startElement, end: endElement };
        lastInputEndElement = endElement;

        // Get correct extract method from mapping
        const extractMethod = this.EXTRACT_METHOD_MAPPING[tag];
        console.log(`Using extract method: ${extractMethod} for tag: ${tag}`);

        try {
          const extractedContent = extractInput[extractMethod](body, startElement, endElement);

          // Validate content is not empty
          if (!extractedContent || extractedContent.trim() === '') {
            throw new Error(`Content for ${tag} is empty`);
          }

          inputs[tag] = extractedContent;
          console.log(`Extracted content for ${tag}:`, {
            length: inputs[tag]?.length || 0,
            preview: inputs[tag]?.substring(0, 100),
          });

          // Update progress for each tag processed
          currentProgress += progressPerTag;
          progressCallback(Math.round(currentProgress), `Processing ${tag} content...`);
        } catch (error) {
          console.error(`Error extracting content for ${tag}:`, error);
          throw new Error(`Failed to extract content for ${tag}: ${error.message}`);
        }
      }

      // Update progress - Start AI processing
      progressCallback(40, 'Initiating AI analysis...');

      // Generate content
      console.log('Starting content generation with method:', config.generatorMethod);
      progressCallback(50, 'Generating strategic recommendations...');

      const generatorResult = await this[config.generatorMethod](inputs);
      console.log('Raw generator result:', generatorResult);

      tokenStats = generatorResult.stats;

      // Update progress - Content generated
      progressCallback(75, 'Processing AI response...');

      // Insert content at the end of the document
      const endOfDoc = body.getNumChildren();

      // Format and insert the output
      progressCallback(85, 'Formatting output...');

      const outputFormatter = new DocumentFormatter();
      const success = outputFormatter.formatOutputResponse(body, generatorResult.text, endOfDoc, {
        headerText: config.outputConfig.headerText,
        headerEmoji: config.outputConfig.headerEmoji,
        xmlTags: config.outputConfig.xmlTags,
      });

      if (!success) {
        throw new Error('Failed to format and insert output');
      }

      // Update progress - Completion
      progressCallback(100, 'Operation completed successfully!');

      return {
        success: true,
        config,
        result: generatorResult,
        tokenStats,
      };
    } catch (error) {
      console.error('Error in process:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      //   logExecution(config.name, tokenStats);
    }
  }

  generateRPPH(userInput) {
    const prompt = `Buatkan RPPH PAUD Kurikulum Merdeka berdasarkan informasi berikut:

    INFO DASAR:
    ${userInput.input_RPPH}

    Harap buatkan RPPH lengkap dengan format berikut:
    1. Identitas (Semester/Bulan/Hari/Tanggal/Kelompok/Tema/Subtema/Alokasi Waktu)
    2. Tujuan Pembelajaran
    3. Materi Pembelajaran
    4. Alat dan Bahan
    5. Kegiatan Pembelajaran (Pembukaan, Inti, Istirahat, Penutup)
    6. Penilaian (Teknik dan Indikator per aspek perkembangan)
    7. Catatan dan Refleksi
    8. Tanda tangan (Kepala TK dan Guru Kelas)

    Berikan dalam format yang terstruktur dan detail.

    `;

    return this.anthropic.callAnthropicAPI(prompt);
  }

  generateActivityDetail(userInput) {
    const prompt = `Berdasarkan informasi kegiatan pembelajaran PAUD berikut:

  ${userInput.input_Activity_Detail}

  Harap berikan penjelasan detail teknis pelaksanaan dengan format berikut:

  1. PERSIAPAN KEGIATAN
     - Penataan lingkungan
     - Persiapan media dan bahan
     - Pengaturan kelompok
     - Hal yang perlu diperhatikan

  2. LANGKAH-LANGKAH PELAKSANAAN
     - Pembukaan/Apersepsi
     - Kegiatan Inti (step by step)
     - Transisi dan Variasi
     - Penutup/Evaluasi

  3. TEKNIK PENGELOLAAN
     - Formasi dan pengaturan anak
     - Teknik pemberian instruksi
     - Strategi menarik perhatian
     - Penanganan situasi khusus

  4. INTERAKSI & KOMUNIKASI
     - Contoh kalimat pembuka
     - Pertanyaan yang bisa diajukan
     - Respon terhadap anak
     - Penguatan positif

  5. PENILAIAN PROSES
     - Indikator keberhasilan
     - Hal yang diamati
     - Catatan perkembangan
     - Tindak lanjut

  6. TIPS & TRIK
     - Kunci keberhasilan
     - Antisipasi kendala
     - Modifikasi kegiatan
     - Alternatif kegiatan

  Berikan dalam format yang praktis dan mudah dipahami oleh guru PAUD.
  
  PETUNJUK PENTING FORMAT PENULISAN:
  1. Gunakan tanda '# ' untuk judul utama (Heading 5).
  2. Gunakan tanda '## ' untuk sub-judul (Bold text).
  3. Gunakan tanda '* ' untuk tingkat pertama dalam daftar (Bullet list, nesting level 0).
  4. Gunakan tanda '• ' untuk tingkat kedua dalam daftar (Bullet list, nesting level 1).
  5. Gunakan huruf 'a., b., c.' untuk tingkat ketiga dalam daftar (Bullet list, nesting level 2).
  6. Gunakan huruf 'i., ii., iii.' untuk tingkat keempat dalam daftar (Bullet list, nesting level 3).
  7. Gunakan tanda '-' untuk bullet point biasa (Bullet list, nesting level 0).
  8. Biarkan baris kosong untuk membuat paragraf baru.
  
  `;

    return this.anthropic.callAnthropicAPI(prompt);
  }

  generateAssessmentGuide(userInput) {
    const prompt = `Berdasarkan informasi pembelajaran PAUD berikut:

    ${userInput.input_Assessment}

    Harap buatkan panduan penilaian komprehensif dengan format berikut:

    1. RUBRIK PENILAIAN
       Untuk setiap aspek perkembangan, berikan:
       - Indikator spesifik yang diamati
       - Kriteria BB (Belum Berkembang)
       - Kriteria MB (Mulai Berkembang)
       - Kriteria BSH (Berkembang Sesuai Harapan)
       - Kriteria BSB (Berkembang Sangat Baik)

    2. INSTRUMEN OBSERVASI
       - Checklist observasi
       - Format catatan anekdot
       - Panduan dokumentasi
       - Skala capaian perkembangan

    3. TEKNIK PENILAIAN
       A. Observasi
          - Hal-hal yang diamati
          - Waktu pengamatan
          - Cara mencatat
          - Format dokumentasi

       B. Unjuk Kerja
          - Kriteria penilaian
          - Langkah-langkah
          - Cara scoring
          - Format pencatatan

       C. Hasil Karya
          - Aspek yang dinilai
          - Kriteria penilaian
          - Cara dokumentasi
          - Format penilaian

    4. PELAPORAN
       - Format laporan harian
       - Format laporan mingguan
       - Format laporan bulanan
       - Rekomendasi tindak lanjut

    5. REKOMENDASI
       - Cara mengkomunikasikan dengan orangtua
       - Tindak lanjut untuk tiap tingkat pencapaian
       - Strategi pengembangan
       - Program penguatan

    6. CONTOH PRAKTIS
       - Contoh pengisian instrumen
       - Contoh interpretasi hasil
       - Contoh laporan perkembangan
       - Contoh rekomendasi

    Berikan dalam format yang praktis dan mudah digunakan guru PAUD dengan memperhatikan prinsip penilaian autentik, berkesinambungan, dan objektif.`;

    return this.anthropic.callAnthropicAPI(prompt);
  }

  generateStory(userInput) {
    const prompt = `Berdasarkan informasi berikut:

    ${userInput.topik_cerita}

    Tolong buatkan sebuah cerita edukatif untuk anak PAUD/TK dengan kriteria berikut:

    1. FORMAT CERITA
       - Judul yang menarik dan mudah diingat
       - Paragraf pendek dan mudah dipahami
       - Alur cerita yang sederhana dan mengalir
       - Menggunakan bahasa yang sesuai anak PAUD/TK
       - Panjang cerita sesuai durasi yang diminta

    2. KOMPONEN CERITA
       - Perkenalan tokoh yang jelas
       - Konflik/masalah yang sederhana
       - Penyelesaian yang positif
       - Pesan moral yang eksplisit
       - Dialog-dialog yang interaktif

    3. ELEMEN PENDUKUNG
       - Deskripsi yang hidup dan imajinatif
       - Repetisi kata/frasa yang mudah diingat
       - Suara-suara atau onomatope yang menarik
       - Momen-momen yang mengundang partisipasi
       - Kejutan-kejutan kecil yang menyenangkan

    4. PANDUAN PENYAMPAIAN
       - Momen untuk interaksi dengan anak
       - Pertanyaan-pertanyaan untuk diskusi
       - Aktivitas lanjutan yang bisa dilakukan

    5. NILAI PEMBELAJARAN
       - Poin pembelajaran utama
       - Nilai moral yang disampaikan
       - Karakter yang dikembangkan
       - Keterampilan yang distimulasi

    Buatkan cerita yang menyenangkan, mudah diingat, dan kaya akan nilai pembelajaran dengan tetap mempertahankan unsur hiburan yang sesuai usia anak.`;

    return this.anthropic.callAnthropicAPI(prompt);
  }
}
