import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs/promises';

export interface OfferLetterData {
  candidateName: string;
  position: string;
  city: string;
  startDate: string;
  duration: string;
  workingMode: string;
  stipendPaid: boolean;
  stipendAmount: string;
  expectedOutput?: string;
  acceptByDate: string;
  noticeDays?: string;
}

export class OfferService {
  private static templatePath = path.join(process.cwd(), 'src', 'templates', 'offer-letter.hbs');

  static async generateOfferPDF(data: OfferLetterData): Promise<Buffer> {
    try {
      // Load and compile the Handlebars template
      const templateContent = await fs.readFile(this.templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);

      // Process the data
      const processedData = this.processOfferData(data);

      // Generate HTML
      const html = template(processedData);

      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();

      // Set content and wait for it to load
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm'
        },
        preferCSSPageSize: true
      });

      // Close browser
      await browser.close();

      return pdfBuffer;

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static processOfferData(data: OfferLetterData): any {
    // Derive additional fields
    const firstName = data.candidateName.split(' ')[0];
    const letterDate = dayjs().format('DD/MM/YYYY');
    const noticeDays = data.noticeDays || '7';
    
    // Compute stipend text
    const stipendText = data.stipendPaid 
      ? `Paid — ₹${data.stipendAmount}/month` 
      : 'Unpaid internship with certificate and Letter of Recommendation';

    // Format dates
    const formattedStartDate = dayjs(data.startDate).format('DD MMMM YYYY');
    const formattedAcceptByDate = dayjs(data.acceptByDate).format('DD MMMM YYYY');

    return {
      ...data,
      firstName,
      letterDate,
      noticeDays,
      stipendText,
      startDate: formattedStartDate,
      acceptByDate: formattedAcceptByDate
    };
  }

  static async validateOfferData(data: OfferLetterData): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Required fields validation
    if (!data.candidateName?.trim()) {
      errors.push('Candidate name is required');
    }
    if (!data.position?.trim()) {
      errors.push('Position is required');
    }
    if (!data.city?.trim()) {
      errors.push('City is required');
    }
    if (!data.startDate) {
      errors.push('Start date is required');
    } else if (!dayjs(data.startDate).isValid()) {
      errors.push('Start date is invalid');
    }
    if (!data.duration?.trim()) {
      errors.push('Duration is required');
    }
    if (!data.workingMode?.trim()) {
      errors.push('Working mode is required');
    }
    if (!data.acceptByDate) {
      errors.push('Accept by date is required');
    } else if (!dayjs(data.acceptByDate).isValid()) {
      errors.push('Accept by date is invalid');
    }

    // Conditional validation
    if (data.stipendPaid && (!data.stipendAmount || isNaN(Number(data.stipendAmount)))) {
      errors.push('Stipend amount is required for paid internship');
    }

    // Date validation
    if (data.startDate && data.acceptByDate) {
      const start = dayjs(data.startDate);
      const acceptBy = dayjs(data.acceptByDate);
      if (acceptBy.isBefore(start)) {
        errors.push('Accept by date must be after start date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
