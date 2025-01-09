function onOpen() {
  createEdukasiMenu().addToUi();
}

function createEdukasiMenu() {
  return DocumentApp.getUi()
    .createMenu('📚 KBTK Al-Muhajirin')
    .addItem('📝 Insert All Templates', 'insertAllTemplate')
    .addItem('⚡ Generate RPPH', 'generateRekomendasiRPPH')
    .addItem('📋 Generate Detail Kegiatan', 'generateActivityDetail')
    .addItem('📊 Generate Panduan Penilaian', 'generateAssessmentGuide')
    .addItem('📖 Generate Cerita Edukatif', 'generateStory')
    .addToUi();
}

// Helper function to show progress modal
function showProgressModal(title) {
  const html = HtmlService.createHtmlOutputFromFile('ProgressModal').setWidth(400).setHeight(200).setTitle(title);
  return DocumentApp.getUi().showModalDialog(html, title);
}

// Function to get current progress (called by ProgressModal.html)
function getCurrentProgress() {
  const progressJson = PropertiesService.getUserProperties().getProperty('progress');
  return progressJson
    ? JSON.parse(progressJson)
    : {
        percentage: 0,
        message: 'Starting...',
      };
}

// Helper function to update progress state
function updateProgressState(percentage, message) {
  PropertiesService.getUserProperties().setProperty(
    'progress',
    JSON.stringify({
      percentage: percentage,
      message: message,
      complete: percentage === 100,
    })
  );
}

// Function to update progress in the modal
function updateProgress(progress) {
  return {
    percentage: progress.percentage,
    message: progress.message,
    complete: progress.complete || false,
  };
}

// Helper function to show success toast
function showSuccessToast(message) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          .success-container {
            text-align: center;
            padding: 15px;
            font-family: Arial, sans-serif;
            min-height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .success-message {
            color: #28a745;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .success-icon {
            font-size: 18px;
          }
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="success-message">
            <span class="success-icon">✓</span>
            ${message}
          </div>
        </div>
        <script>
          function onLoad() {
            setTimeout(function() {
              google.script.host.close();
            }, 1500);
          }
          window.onload = onLoad;
        </script>
      </body>
    </html>
  `;
  const userInterface = HtmlService.createHtmlOutput(html)
    .setWidth(300) // Set smaller width
    .setHeight(100); // Set smaller height
  DocumentApp.getUi().showModalDialog(userInterface, 'Success');
}

function processRekomendasiEdukasi(configKey) {
  // Show progress modal
  showProgressModal(`Processing ${configKey}`);

  // Initialize progress
  updateProgressState(10, 'Starting process...');

  const edukasi_kbtk = new Edukasi();

  edukasi_kbtk
    .process(
      configKey,
      // Progress callback
      (percentage, message) => {
        updateProgressState(percentage, message);
      }
    )
    .then((processResult) => {
      if (processResult.success) {
        const outputFormatter = new DocumentFormatter();
        const formatSuccess = outputFormatter.formatOutputResponse(
          DocumentApp.getActiveDocument().getBody(),
          processResult.result.text,
          processResult.endParaIndex,
          processResult.config.outputConfig
        );

        if (formatSuccess) {
          // Complete
          updateProgressState(100, 'Operation completed successfully!');

          // Wait before showing toast
          Utilities.sleep(1000);

          // Show success toast
          showSuccessToast(`Rekomendasi "${processResult.config.name}" telah selesai dibuat.`);

          // logExecution(`Rekomendasi ${processResult.config.name}`, processResult.result.stats);
        } else {
          throw new Error('Failed to format output');
        }
      } else {
        throw new Error(processResult.error);
      }
    })
    .catch((error) => {
      updateProgressState(100, `Error: ${error.message}`);
      DocumentApp.getUi().alert('Error: ' + error.message);
    });
}

// Wrapper functions
function generateRekomendasiRPPH() {
  processRekomendasiEdukasi('RPPH');
}

function generateActivityDetail() {
  processRekomendasiEdukasi('ACTIVITY_DETAIL');
}

function generateAssessmentGuide() {
  processRekomendasiEdukasi('ASSESSMENT_GUIDE');
}

function generateStory() {
  processRekomendasiEdukasi('STORY');
}

function insertAllTemplate() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();

  // Clear existing content (optional, if you want to reset the document)
  body.clear();

  // Insert RPPH Template
  const rpphTemplate = `
<input_RPPH>
  INFORMASI DASAR:
  Jenjang: [PAUD/KB/TK]
  Kelompok: [A/B]
  Usia: [4-5 tahun / 5-6 tahun]
  Tema: [...]
  Subtema: [...]
  Semester: [1/2]
  Bulan: [...]
  Alokasi waktu: [contoh: 08.00-11.00 WIB]

  FOKUS PENGEMBANGAN:
  Aspek yang diprioritaskan: [mis: motorik halus, bahasa, dll]
  Pendekatan pembelajaran: [mis: sentra, area, kelompok]
  Metode: [mis: bercerita, eksperimen, proyek]
  Jenis kegiatan: [mis: outdoor, crafting, eksplorasi]

  KONDISI KELAS (opsional):
  Jumlah siswa: [...]
  Media pembelajaran tersedia: [...]
  Fasilitas: [...]
</input_RPPH>
`;

  // Insert Activity Detail Template
  const activityDetailTemplate = `
<input_Activity_Detail>
INFORMASI KEGIATAN:
Nama Kegiatan: [nama kegiatan yang ingin dijelaskan]
Jenis Kegiatan: [pembukaan/inti/istirahat/penutup]
Durasi: [estimasi waktu]
Jumlah Anak: [jumlah anak dalam kelompok]
Aspek Perkembangan: [aspek yang dikembangkan]

KONDISI & KEBUTUHAN:
Ruangan: [indoor/outdoor]
Media yang Tersedia: [daftar media]
Kendala yang Mungkin: [antisipasi kendala]
Target Capaian: [hasil yang diharapkan]
</input_Activity_Detail>
`;

  // Insert Assessment Template
  const assessmentTemplate = `
<input_Assessment>
INFORMASI PEMBELAJARAN:
Kelompok Usia: [A/B - usia anak]
Tema/Subtema: [tema pembelajaran]
Kegiatan: [kegiatan yang akan dinilai]
Aspek Penilaian: [aspek yang akan dinilai]

INDIKATOR PERKEMBANGAN:
1. Nilai Agama & Moral: [indikator yang relevan]
2. Fisik-Motorik: [indikator yang relevan]
3. Kognitif: [indikator yang relevan]
4. Bahasa: [indikator yang relevan]
5. Sosial-Emosional: [indikator yang relevan]
6. Seni: [indikator yang relevan]

KONDISI PENILAIAN:
Jumlah Anak: [jumlah anak yang dinilai]
Waktu Penilaian: [durasi/waktu]
Metode: [observasi/unjuk kerja/hasil karya/dll]
</input_Assessment>
`;

  // Insert Story Template
  const storyTemplate = `
<topik_cerita>
INFORMASI CERITA:
Tema: [tema yang diinginkan]
Usia Anak: [rentang usia target]
Durasi Cerita: [sekitar ... menit]
Nilai yang Diajarkan: [nilai moral/pembelajaran]
Karakter yang Diinginkan: [hewan/anak/profesi/dll]
Suasana Cerita: [ceria/petualangan/lucu/dll]
</topik_cerita>
`;

  // Function to insert a template with formatting
  const insertTemplateWithFormatting = (template, tag) => {
    const startTag = `<${tag}>`;
    const endTag = `</${tag}>`;

    // Split the template into parts: opening tag, content, and closing tag
    const templateParts = template.split(startTag);
    if (templateParts.length < 2) return; // Invalid template format

    const contentAndClosingTag = templateParts[1].split(endTag);
    if (contentAndClosingTag.length < 2) return; // Invalid template format

    const content = contentAndClosingTag[0].trim(); // Get the content

    // Insert the opening tag as Heading 3
    const openingTagParagraph = body.appendParagraph(startTag);
    openingTagParagraph.setHeading(DocumentApp.ParagraphHeading.HEADING3);

    // Insert a line break after the opening tag
    body.appendParagraph('');

    // Insert the content as Normal style
    const contentParagraph = body.appendParagraph(content);
    contentParagraph.setHeading(DocumentApp.ParagraphHeading.NORMAL);

    // Insert a line break before the closing tag
    body.appendParagraph('');

    // Insert the closing tag as Normal
    const closingTagParagraph = body.appendParagraph(endTag);
    closingTagParagraph.setHeading(DocumentApp.ParagraphHeading.NORMAL);

    // Add spacing between templates
    body.appendParagraph('');
  };

  // Insert all templates with formatting
  insertTemplateWithFormatting(rpphTemplate, 'input_RPPH');
  insertTemplateWithFormatting(activityDetailTemplate, 'input_Activity_Detail');
  insertTemplateWithFormatting(assessmentTemplate, 'input_Assessment');
  insertTemplateWithFormatting(storyTemplate, 'topik_cerita');
}
