
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  neetScore: z.string().min(1, "NEET score is required"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits"),
  comments: z.string().optional(),
});

export function RequestCallbackForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      neetScore: "",
      email: "",
      mobile: "",
      comments: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      // Send form data via Supabase Edge Function with robust key mapping
      const { data, error } = await supabase.functions.invoke("send-contact-form", {
        body: {
          name: values.fullName,
          fullName: values.fullName, // Fallback for older function versions
          neetScore: values.neetScore,
          email: values.email,
          phone: values.mobile,
          mobile: values.mobile, // Fallback for older function versions
          message: values.comments || "",
          source: 'callback'
        }
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Your request has been submitted. We will get back to you soon.",
      });
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "There was a problem submitting your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-semibold">Full Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g. Rahul Sharma" 
                    className="h-12 bg-white/50 border-slate-200 focus:border-blue-500 rounded-xl transition-all" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="neetScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-semibold">NEET Score</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. 650" 
                      className="h-12 bg-white/50 border-slate-200 focus:border-blue-500 rounded-xl transition-all" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-semibold">Mobile Number</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      placeholder="e.g. +91 9876543210" 
                      className="h-12 bg-white/50 border-slate-200 focus:border-blue-500 rounded-xl transition-all" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-semibold">Email Address</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="rahul@example.com" 
                    className="h-12 bg-white/50 border-slate-200 focus:border-blue-500 rounded-xl transition-all" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="comments"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-semibold">Your Query (Optional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Tell us about your preferred college or any specific questions..."
                    className="min-h-[100px] bg-white/50 border-slate-200 focus:border-blue-500 rounded-2xl transition-all resize-none" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full h-14 indian-medical-gradient hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl text-lg font-bold shadow-xl shadow-blue-900/10 mt-2" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Submitting...</span>
            </div>
          ) : "Request Callback Now"}
        </Button>
        <p className="text-center text-xs text-slate-400 mt-4">
          By submitting, you agree to our privacy policy and to be contacted by our counselors.
        </p>
      </form>
    </Form>
  );
}
