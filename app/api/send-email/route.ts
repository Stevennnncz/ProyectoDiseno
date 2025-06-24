import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Crear un transporter de nodemailer usando Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Contraseña de aplicación de Gmail
  },
});

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, html' }, { status: 400 });
    }

    // Enviar el correo usando nodemailer
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: to, // Puede ser un string o un array de strings
      subject: subject,
      html: html,
    });

    console.log('Correo enviado:', info.messageId);
    return NextResponse.json({ 
      messageId: info.messageId, 
      message: 'Correo enviado exitosamente.' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en la ruta API de envío de correo:', error);
    return NextResponse.json({ 
      error: error.message || 'Error desconocido al enviar correo.' 
    }, { status: 500 });
  }
} 