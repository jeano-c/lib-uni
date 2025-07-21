"use server"

import { signIn } from "@/auth";
import { db } from "@/database/drizzle";
import { usersTable } from "@/database/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ratelimit from "../ratelimit";
import { workflowClient } from "../workflow";
import config from "../config";

type AuthCredentials = {
    fullName: string;
    email: string;
    universityId: number;
    password: string;
    universityCard: string;
};

export const signInWithCredentials = async (params: Pick<AuthCredentials, "email" | "password">) => {
    const { email, password } = params;
    const ip = (await headers()).get('x-forwarded-for') || '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    
    if (!success) {
        redirect("/too-fast");
    }
    
    try {
        const result = await signIn('credentials', {
            email, 
            password, 
            redirect: false
        });
        
        if (result?.error) {
            return {
                success: false, 
                error: result.error
            };
        }
        
        return { success: true };
    } catch (error) {
        console.log(error, "Sign in error");
        return { 
            success: false, 
            error: "Sign in Error" 
        };
    }
};

export const signUp = async (params: AuthCredentials) => {
    const { fullName, email, universityId, password, universityCard } = params;
    const ip = (await headers()).get('x-forwarded-for') || '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    
    if (!success) {
        redirect("/too-fast");
    }


    const existingUser = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

    if (existingUser.length > 0) {
        return { 
            success: false, 
            error: "User already exists" 
        };
    }

    const hashedPassword = await hash(password, 10);
    
    try {

        await db.insert(usersTable).values({
            fullName,
            email,
            universityId,
            password: hashedPassword,
            universityCard
        });

        try {
            await workflowClient.trigger({
                url: `${config.env.prodApiEndpoint}/api/workflows/onboarding`
            });
        } catch (workflowError) {
            console.log("Workflow trigger failed:", workflowError);
      
        }

        const signInResult = await signInWithCredentials({ email, password });
        
        if (!signInResult.success) {
            return { 
                success: false, 
                error: "Registration successful but auto-login failed. Please sign in manually." 
            };
        }

        // Redirect to home page after successful registration and login
        redirect("/");
        
    } catch (error) {
        console.log(error, "Sign up error");
        return { 
            success: false, 
            error: "Registration failed. Please try again." 
        };
    }
};