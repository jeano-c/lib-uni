"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DefaultValues,
  FieldValues,
  Path,
  SubmitHandler,
  useForm,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { z, ZodType } from "zod";
import Link from "next/link";
import { FIELD_NAMES } from "@/constants";
import ImageUpload from "./ImageUpload";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";

interface Props<T extends FieldValues> {
  schema: ZodType<T, any, any>;
  defaultValues: T;
  onSubmit: (data: T) => Promise<{ success: boolean; error?: string }>;
  type: "SIGN_IN" | "SIGN_UP";
}

const AuthForm = <T extends FieldValues>({
  type,
  schema,
  defaultValues,
  onSubmit,
}: Props<T>) => {
  const router = useRouter();
  const isSignIn = type === "SIGN_IN";
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<T>,
    mode: "onChange", // This will show validation errors as user types
  });

  const handleSubmit: SubmitHandler<T> = async (data) => {
    console.log("Form submitted with data:", data); // Debug log
    
    setIsSubmitting(true);
    
    try {
      // Validate the data against schema before submitting
      const validatedData = schema.parse(data);
      console.log("Validated data:", validatedData); // Debug log
      
      const res = await onSubmit(validatedData);
      console.log("Submit response:", res); // Debug log

      if (res.success) {
        toast.success(
          isSignIn
            ? "You have successfully signed in!"
            : "You have successfully signed up!"
        );
        
        // Small delay to show the toast before redirecting
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        const errorMessage = res.error || (isSignIn ? "Error signing in" : "Error signing up");
        toast.error(errorMessage);
        console.error("Submit error:", res.error);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      
      if (error instanceof z.ZodError) {
        // Handle validation errors
        toast.error("Please check your form for errors");
        console.error("Validation errors:", error.message);
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-white">
        {isSignIn ? "Welcome Back to BookWise" : "Create your Library Account"}
      </h1>
      <p className="text-light-100">
        {isSignIn
          ? "Access the vast collection of resources and stay updated"
          : "Please complete all fields and upload a valid university ID to gain access to the library"}
      </p>
      
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="w-full space-y-6"
        >
          {Object.keys(defaultValues).map((field) => (
            <FormField
              key={field}
              control={form.control}
              name={field as Path<T>}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel className="text-white">
                    {FIELD_NAMES[field] || field}
                  </FormLabel>
                  <FormControl>
                    {field === "universityCard" ? (
                      <ImageUpload
                        value={formField.value}
                        onChange={formField.onChange}
                        onBlur={formField.onBlur}
                        disabled={isSubmitting}
                      />
                    ) : (
                      <Input
                        className="form-input"
                        placeholder={`Enter ${FIELD_NAMES[field] || field}`}
                        type={
                          field === "password"
                            ? "password"
                            : field === "email"
                            ? "email"
                            : field === "universityId"
                            ? "number"
                            : "text"
                        }
                        disabled={isSubmitting}
                        {...formField}
                        // Convert number fields properly
                        onChange={(e) => {
                          const value = field === "universityId" 
                            ? e.target.value === "" ? 0 : parseInt(e.target.value) || 0
                            : e.target.value;
                          formField.onChange(value);
                        }}
                        value={field === "universityId" ? (formField.value || "") : formField.value}
                      />
                    )}
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
          ))}

          <Button 
            className="form-btn w-full" 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {isSignIn ? "Signing In..." : "Creating Account..."}
              </>
            ) : (
              isSignIn ? "Sign In" : "Sign Up"
            )}
          </Button>
          
        </form>
      </Form>
      
      <p className="text-center text-base font-medium text-white">
        {isSignIn ? "New to BookWise? " : "Already have an account? "}
        <Link
          className="font-bold text-primary underline"
          href={isSignIn ? "/sign-up" : "/sign-in"}
        >
          {isSignIn ? "Create an Account" : "Sign In"}
        </Link>
      </p>
    </div>
  );
};

export default AuthForm;