class DocumentFormatter {
  /**
   * Format dan insert output ke dokumen
   * @param {Body} body - Document body
   * @param {string} content - Content yang akan diinsert
   * @param {number} insertPosition - Posisi insert
   * @param {Object} config - Konfigurasi output (headerText, headerEmoji, xmlTags)
   */
  formatOutputResponse(body, content, insertPosition, config) {
    try {
      // Cek apakah tag XML sudah ada
      const tagStartElement = body.findText(`<${config.xmlTags}>`);
      const tagEndElement = body.findText(`</${config.xmlTags}>`);

      if (tagStartElement && tagEndElement) {
        // Jika tag sudah ada, gunakan _formatWithinTags
        this._formatWithinTags(
          body,
          content,
          {
            startTag: `<${config.xmlTags}>`,
            endTag: `</${config.xmlTags}>`,
          },
          {
            headerText: config.headerText,
            headerEmoji: config.headerEmoji,
          }
        );
      } else {
        // Jika tag belum ada, gunakan _formatAtPosition
        this._formatAtPosition(body, content, insertPosition, {
          headerText: config.headerText,
          headerEmoji: config.headerEmoji,
          xmlTags: config.xmlTags,
        });
      }
      return true;
    } catch (error) {
      console.error('Error in formatOutputResponse:', error);
      return false;
    }
  }

  _formatWithinTags(body, content, targetTags, options) {
    const { startTag, endTag } = targetTags;

    const startTagElement = body.findText(startTag);
    const endTagElement = body.findText(endTag);

    if (!startTagElement || !endTagElement) {
      throw new Error(`Tags ${startTag} and ${endTag} must exist in the document`);
    }

    const startElement = startTagElement.getElement().getParent();
    const endElement = endTagElement.getElement().getParent();

    const startIndex = body.getChildIndex(startElement);
    const endIndex = body.getChildIndex(endElement);

    for (let i = endIndex - 1; i > startIndex; i--) {
      body.removeChild(body.getChild(i));
    }

    this._formatContentLines(body, content, startIndex + 1, options);
  }

  _formatAtPosition(body, content, endParaIndex, options) {
    const { headerText = '✨ ', headerEmoji = '✨' } = options;

    const newPosition = endParaIndex + 1;

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });
    const responseHeader = body.insertParagraph(newPosition, `[${timeString}] [${headerEmoji} ${headerText}]`);
    responseHeader.setHeading(DocumentApp.ParagraphHeading.HEADING1);

    body.insertParagraph(newPosition + 1, '');

    this._formatContentLines(body, content, newPosition + 2, options);
  }

  _formatContentLines(body, content, startPosition, options) {
    const lines = content.split('\n');
    let currentParagraph;
    let lastListItem = null;
    let currentNestingLevel = 0;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const insertPosition = startPosition + index;

      if (trimmedLine === '') {
        lastListItem = null;
        currentNestingLevel = 0;
        body.insertParagraph(insertPosition, '');
        return;
      }

      const isHeading5 = trimmedLine.match(/^# /);
      const isBold = trimmedLine.match(/^(##|###) /);

      let processedText = trimmedLine;
      if (isHeading5) {
        processedText = trimmedLine.substring(2);
      } else if (isBold) {
        const hashLength = trimmedLine.match(/^(#+)/)[0].length;
        processedText = trimmedLine.substring(hashLength + 1);
      }

      // Check for all types of bullet points and nesting indicators
      if (processedText.startsWith('•') || processedText.startsWith('*') || processedText.match(/^[a-z]\./) || processedText.match(/^[i]+\./)) {
        let bulletText = processedText;

        // Handle different bullet point types
        if (processedText.startsWith('•')) {
          bulletText = processedText.substring(1).trim();
          currentNestingLevel = 0;
        } else if (processedText.startsWith('*')) {
          bulletText = processedText.substring(1).trim();
          currentNestingLevel = 1;
        } else if (processedText.match(/^[a-z]\./)) {
          // For a., b., c. etc.
          bulletText = processedText.substring(2).trim();
          currentNestingLevel = 1;
        } else if (processedText.match(/^[i]+\./)) {
          // For i., ii., iii. etc.
          bulletText = processedText.substring(processedText.indexOf('.') + 1).trim();
          currentNestingLevel = 2;
        }

        // Create or continue list
        lastListItem = body.insertListItem(insertPosition, bulletText);
        lastListItem.setGlyphType(DocumentApp.GlyphType.BULLET);
        lastListItem.setNestingLevel(currentNestingLevel);

        // Apply consistent formatting
        lastListItem.setAttributes({
          [DocumentApp.Attribute.FONT_FAMILY]: 'Arial',
          [DocumentApp.Attribute.FONT_SIZE]: 11,
          [DocumentApp.Attribute.BOLD]: false,
        });
      }
      // Handle regular dash bullet points
      else if (processedText.startsWith('-')) {
        const bulletText = processedText.substring(1).trim();

        lastListItem = body.insertListItem(insertPosition, bulletText);
        lastListItem.setGlyphType(DocumentApp.GlyphType.BULLET);
        lastListItem.setNestingLevel(currentNestingLevel);

        lastListItem.setAttributes({
          [DocumentApp.Attribute.FONT_FAMILY]: 'Arial',
          [DocumentApp.Attribute.FONT_SIZE]: 11,
          [DocumentApp.Attribute.BOLD]: false,
        });
      }
      // Handle regular text
      else {
        lastListItem = null;
        currentNestingLevel = 0;

        currentParagraph = body.insertParagraph(insertPosition, processedText);

        currentParagraph.setAttributes({
          [DocumentApp.Attribute.FONT_FAMILY]: 'Arial',
          [DocumentApp.Attribute.FONT_SIZE]: 11,
        });

        if (isHeading5) {
          currentParagraph.setHeading(DocumentApp.ParagraphHeading.HEADING5);
        }

        if (isBold && processedText.length > 0) {
          const textElement = currentParagraph.editAsText();
          textElement.setBold(0, processedText.length - 1, true);
        }
      }
    });
  }
}
