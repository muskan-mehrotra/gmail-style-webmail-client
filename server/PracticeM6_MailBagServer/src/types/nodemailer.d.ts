declare module "nodemailer" {
  type TransportConfig = {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };

  type SendMailConfig = {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  };

  type SendMailResult = {
    messageId: string;
  };

  type Transporter = {
    sendMail(options: SendMailConfig): Promise<SendMailResult>;
  };

  const nodemailer: {
    createTransport(config: TransportConfig): Transporter;
  };

  export default nodemailer;
}
