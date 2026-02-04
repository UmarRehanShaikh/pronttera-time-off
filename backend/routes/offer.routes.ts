import express from 'express';
import { OfferService, OfferLetterData } from '../services/offer.service';

const router = express.Router();

// Auth middleware placeholder - replace with your actual auth middleware
const auth = (roles: string[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Replace this with your actual authentication logic
    // For now, we'll assume the user is authenticated and has the required role
    // In a real implementation, you would check the user's role from the session/JWT token
    next();
  };
};

// POST /api/admin/generate-offer
router.post('/generate-offer', auth(['admin']), async (req: express.Request, res: express.Response) => {
  try {
    const offerData: OfferLetterData = req.body;

    // Validate the input data
    const validation = await OfferService.validateOfferData(offerData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Generate the PDF
    const pdfBuffer = await OfferService.generateOfferPDF(offerData);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="offer-letter-${offerData.candidateName.replace(/\s+/g, '-').toLowerCase()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send the PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error in generate-offer route:', error);
    
    // Send appropriate error response
    const statusCode = error instanceof Error && error.message.includes('Failed to generate PDF') ? 500 : 400;
    
    res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
    });
  }
});

// GET /api/admin/offer-preview (optional - for preview functionality)
router.get('/offer-preview', auth(['admin']), async (req: express.Request, res: express.Response) => {
  try {
    // This could be used to show a preview of the offer letter before generating PDF
    const { candidateName, position, city, startDate, duration, workingMode, stipendPaid, stipendAmount, expectedOutput, acceptByDate, noticeDays } = req.query;

    const offerData: OfferLetterData = {
      candidateName: candidateName as string || 'John Doe',
      position: position as string || 'Frontend Developer Intern',
      city: city as string || 'Mumbai',
      startDate: startDate as string || new Date().toISOString().split('T')[0],
      duration: duration as string || '3 months',
      workingMode: workingMode as string || 'Remote',
      stipendPaid: stipendPaid === 'true',
      stipendAmount: stipendAmount as string || '10000',
      expectedOutput: expectedOutput as string,
      acceptByDate: acceptByDate as string || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      noticeDays: noticeDays as string || '7'
    };

    // For preview, we could return the HTML instead of PDF
    const { OfferService } = await import('../services/offer.service');
    const templatePath = require('path').join(process.cwd(), 'src', 'templates', 'offer-letter.hbs');
    const fs = require('fs/promises');
    const handlebars = require('handlebars');
    const dayjs = require('dayjs');

    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const template = handlebars.compile(templateContent);

    // Process the data
    const firstName = offerData.candidateName.split(' ')[0];
    const letterDate = dayjs().format('DD/MM/YYYY');
    const stipendText = offerData.stipendPaid 
      ? `Paid — ₹${offerData.stipendAmount}/month` 
      : 'Unpaid internship with certificate and Letter of Recommendation';

    const processedData = {
      ...offerData,
      firstName,
      letterDate,
      noticeDays: offerData.noticeDays || '7',
      stipendText,
      startDate: dayjs(offerData.startDate).format('DD MMMM YYYY'),
      acceptByDate: dayjs(offerData.acceptByDate).format('DD MMMM YYYY')
    };

    const html = template(processedData);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Error in offer-preview route:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
});

export default router;
