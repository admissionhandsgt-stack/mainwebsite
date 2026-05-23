"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight, Phone } from "lucide-react";
import Image from "next/image";
import { CONTACT_INFO } from "@/lib/constants";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

/* ─── animation variants ─── */
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeRight = {
  hidden: { opacity: 0, x: 40, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.3 },
  },
};

export const PGHero = () => {
  return (
    <section
      id="pg-hero"
      className="relative w-full min-h-[480px] md:min-h-[600px] md:h-screen flex items-center overflow-hidden bg-white"
      role="banner"
    >
      {/* ── Background: soft gradient + radial glow ── */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/80 to-slate-50" />
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-blue-200/30 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-sky-100/40 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #3b82f6 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ── Main content ── */}
      <div className="container-custom relative z-10 h-full flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          
          {/* LEFT SIDE: Content */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="max-w-xl lg:max-w-none text-center lg:text-left py-6 md:pt-0 md:pb-0"
          >
            {/* Tagline pill */}
            <motion.div variants={fadeUp} className="mb-6 flex justify-center lg:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-4 py-2 text-[10px] font-black text-blue-600 tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                NEET PG 2025 Counselling Guidance
              </span>
            </motion.div>

            {/* Main heading */}
            <motion.h1
              variants={fadeUp}
              className="text-responsive-h1 text-slate-900 mb-6"
            >
              Get Your{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-500">
                  PG MD/MS Seat
                </span>
                <span className="absolute -bottom-1 left-0 w-full h-2.5 bg-blue-100/70 rounded-full -z-0" />
              </span>
              <br className="hidden sm:block" />
              {" "}Without Confusion
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={fadeUp}
              className="text-responsive-body text-slate-500 mb-8 max-w-lg mx-auto lg:mx-0 font-medium"
            >
              Based on your NEET rank, budget &amp; category — get expert guidance
              for government and private colleges.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-4 mb-8 justify-center lg:justify-start"
            >
              <a
                href={`tel:${CONTACT_INFO.phone.replace(/[+\s-]/g, "")}`}
                className="group relative inline-flex items-center justify-center gap-2 md:gap-3 rounded-xl md:rounded-2xl bg-blue-600 px-5 md:px-8 py-3.5 md:py-5 text-white font-black text-sm md:text-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.97] transition-all duration-300"
              >
                Check Your Chances
                <ArrowRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform duration-200"
                />
              </a>

              <a
                href={`https://wa.me/${CONTACT_INFO.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 md:gap-3 rounded-xl md:rounded-2xl border-2 border-slate-200 bg-white/70 backdrop-blur-sm px-5 md:px-8 py-3.5 md:py-5 text-slate-800 font-black text-sm md:text-lg hover:bg-white hover:border-blue-200 hover:text-blue-600 active:scale-[0.97] transition-all duration-300"
              >
                <WhatsAppIcon size={20} className="text-emerald-500" />
                Talk to Expert
              </a>
            </motion.div>

            {/* Micro trust line */}
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
            >
              <span className="inline-flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                Trusted by 2100+ students
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                Transparent process
              </span>
            </motion.div>
          </motion.div>

          {/* RIGHT SIDE: Doctor Image */}
          <motion.div
            variants={fadeRight}
            initial="hidden"
            animate="visible"
            className="relative hidden md:flex items-center justify-center lg:justify-end h-[400px] md:h-full"
          >
            <div className="absolute w-[85%] h-[85%] rounded-full bg-gradient-to-br from-blue-100/60 via-sky-50/40 to-transparent blur-3xl" />
            <div className="absolute w-[75%] aspect-square rounded-full border border-blue-100/50" />
            
            <div className="relative w-full max-w-[500px]">
              <Image
                src="/assets/images/hero/indian_doctors.png"
                alt="Professional doctors ready to guide NEET PG aspirants"
                width={600}
                height={650}
                priority
                className="w-full h-auto object-contain drop-shadow-2xl scale-110 origin-bottom"
                sizes="(max-width: 768px) 90vw, (max-width: 1024px) 45vw, 540px"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

