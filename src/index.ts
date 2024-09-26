import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors';
//import nodemailer from 'nodemailer';
import { config } from 'dotenv';
import nodemailer from 'nodemailer';
import { Client } from '@notionhq/client';



config();



const API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const BASE_URL = process.env.PUBLIC_BASE_URL;
const MY_URL = process.env.MY_HONO_URL;

const app = new Hono()

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});



app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'], 
  allowHeaders: ['Content-Type', 'Authorization'], // 許可するヘッダー
}));

app.options('*', (c) => {
  console.log('CORS preflight request received');
  return c.text('CORS preflight response');
});

//app.get('/', (c) => {
 // return c.text('Hello Hono!')
//})


app.get('/page/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return c.json(page);
  } catch (error) {
    console.error('Error fetching Notion page:', error);
    return c.json({ error: 'Error fetching Notion page' }, 500);
  }
});


app.get('/blocks/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const blocks = [];
    let cursor: string | undefined = undefined;

    while (true) {
      const { results, next_cursor } = await notion.blocks.children.list({
        start_cursor: cursor ?? undefined,
        block_id: id,
      });

      blocks.push(...results);

      if (!next_cursor) {
        break;
      }
      cursor = next_cursor;
    }

    return c.json(blocks);
  } catch (error) {
    console.error('Error fetching Notion blocks:', error);
    return c.json({ error: 'Error fetching Notion blocks' }, 500);
  }
});

app.get('/events', async (c) => {
  //const API_KEY = process.env.GOOGLE_API_KEY;
  //const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
  //const API_KEY = process.env.GOOGLE_API_KEY || "YOUR_API_KEY";
  //const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "YOUR_CALENDAR_ID";
  const API_URL = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL);

    
    const data: any = await response.json(); 

    return c.json(data); 
  } catch (error) {
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

app.post('/mailform', async (c) => {
  try {
    const { firstName, lastName, question } = await c.req.json();

    console.log(`FirstName: ${firstName}`);
    console.log(`LastName: ${lastName}`);
    console.log(`Question: ${question}`);

    //const nodemailer = await import('nodemailer');
    //const nodemailer = (await import('nodemailer')).default;
    //const { default: nodemailer } = await import('nodemailer');
    //const nodemailer = await import('nodemailer').then(module => module.default);


    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_RECIPIENT,
      subject: 'New Form Submission',
      text: `FirstName: ${firstName}\nLastName: ${lastName}\nQuestion: ${question}`,
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
    return c.text('Form received and email sent');
  } catch (error) {
    
    if (error instanceof Error) {
      console.error('Error in /mailform:', error.message);
      return c.text(`Failed to send email: ${error.message}`, 500);
    } else {
      console.error('Unknown error in /mailform:', error);
      return c.text('Failed to send email: Unknown error', 500);
    }
  }
});


const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
