import { Client as WorkflowClient } from "@upstash/workflow"
import config from "./config"
import { Resend } from 'resend';

export const workflowClient = new WorkflowClient({
    baseUrl: config.env.upstash.qstashUrl,
    token: config.env.upstash.qstashToken,
})

const resend = new Resend(config.env.resendToken);

export const sendEmail = async ({ email, subject, message }: { email: string, subject: string, message: string }) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'BURAT <testing.toyometal.store>',
            to: [email],
            subject, 
            html: message, 
        });

        if (error) {
            console.error({ error });
            throw new Error(`Failed to send email: ${error.message}`);
        }
        console.log({ data });
        return { success: true, data };
    } catch (err: any) {
        console.error('Email sending error:', err);
        return { success: false, error: err.message };
    }
}