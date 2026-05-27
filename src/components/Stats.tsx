"use client";
import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  GraduationCap,
  Users,
  Building,
  Star,
  ChevronLeft,
  ChevronRight,
  Quote,
} from 'lucide-react';

const stats = [
  {
    icon: Trophy,
    value: "95%",
    label: "Success Rate",
    description: "students secured preferred admissions",
    gradient: "from-amber-500 to-orange-500",
    bg: "from-amber-50 to-orange-50",
  },
  {
    icon: GraduationCap,
    value: "1200+",
    label: "Success Stories",
    description: "students counselled in top colleges",
    gradient: "from-blue-500 to-indigo-600",
    bg: "from-blue-50 to-indigo-50",
  },
  {
    icon: Users,
    value: "25+",
    label: "Expert Counselors",
    description: "with decades of experience",
    gradient: "from-teal-500 to-emerald-500",
    bg: "from-teal-50 to-emerald-50",
  },
  {
    icon: Building,
    value: "100+",
    label: "College Affiliations",
    description: "Across India & Abroad",
    gradient: "from-rose-500 to-pink-500",
    bg: "from-rose-50 to-pink-50",
  },
];

const testimonials = [
  {
    content: "Admission Hands made the entire admission process seamless and stress-free. Their expertise gave me the confidence to focus on my goals, not the paperwork.",
    name: "Dr. Himanshu Jaiswal",
    rating: 5,
    color: "from-blue-500 to-teal-400",
  },
  {
    content: "From shortlisting colleges to final admission, the team was incredibly supportive and transparent. I couldn't have asked for better guidance.",
    name: "Dr. Shudhranshu",
    rating: 5,
    color: "from-purple-500 to-pink-500",
  },
  {
    content: "The counselors at Admission Hands really understand what students need. Their insights and personalized support made all the difference.",
    name: "Dr. Ankur Singh",
    rating: 5,
    color: "from-orange-500 to-amber-400",
  },
  {
    content: "I was confused about college choices and fee structures. Admission Hands provided clarity and helped me make the right decision at every step.",
    name: "Dr. Yashowardhan Jain",
    rating: 5,
    color: "from-green-500 to-emerald-400",
  },
  {
    content: "Their end-to-end assistance — from documentation to counseling — was exceptional. I'm truly grateful for their professional and ethical approach.",
    name: "Dr. Tejveer Singh",
    rating: 5,
    color: "from-red-500 to-rose-400",
  },
  {
    content: "Admission Hands turned a complex process into a smooth experience. Their guidance felt more like mentorship than consultancy.",
    name: "Dr. Syeeda Rizvi",
    rating: 5,
    color: "from-indigo-500 to-blue-400",
  },
  {
    content: "I trusted them with one of the most important decisions of my life, and they delivered beyond expectations. Highly recommend!",
    name: "Dr. Komal Prajapati",
    rating: 5,
    color: "from-cyan-500 to-sky-400",
  },
  {
    content: "Thanks to Admission Hands, I got into the right college without any stress or confusion. Their commitment to students is unmatched.",
    name: "Dr. Ayanur Rahman",
    rating: 5,
    color: "from-fuchsia-500 to-violet-400",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.1, ease: "easeOut" },
  }),
};

const Stats: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let lastTimestamp = 0;
    const speed = 0.1;

    const scroll = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const elapsed = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (scrollContainer && !isPaused) {
        scrollContainer.scrollLeft += speed * elapsed;
        const halfwayPoint = scrollContainer.scrollWidth / 2;
        if (scrollContainer.scrollLeft >= halfwayPoint) {
          scrollContainer.scrollLeft = 0;
        }
        const half = scrollContainer.scrollWidth / 2;
        setCanScrollLeft(scrollContainer.scrollLeft > 0);
        setCanScrollRight(scrollContainer.scrollLeft < half - scrollContainer.clientWidth);
      }

      animationRef.current = requestAnimationFrame(scroll);
    };

    animationRef.current = requestAnimationFrame(scroll);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPaused]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setIsPaused(true);
    el.scrollBy({ left: direction === 'left' ? -340 : 340, behavior: 'smooth' });
    setTimeout(() => setIsPaused(false), 1200);
  };

  return (
    <section className="py-24 relative overflow-hidden bg-slate-50/30 dark:bg-slate-950/40">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-950/20 -z-10" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-100/30 dark:bg-teal-900/10 rounded-full blur-3xl" />
      <div className="container-custom">

        {/* Section header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-block text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-widest mb-3"
          >
            Our Impact
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif" }}
          >
            Numbers That <span className="gradient-text">Speak for Themselves</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-gray-500 dark:text-slate-400 max-w-xl mx-auto"
          >
            Transforming medical aspirations into achievements, one student at a time.
          </motion.p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                variants={cardVariants}
                className={`rounded-3xl glass dark:bg-slate-900/40 dark:border-slate-800/50 p-7 flex flex-col items-center text-center card-hover overflow-hidden relative group`}
              >
                {/* Status-specific background glow */}
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-4 shadow-md`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div
                  className={`text-3xl font-extrabold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-1`}
                  style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
                >
                  {stat.value}
                </div>
                <div className="font-semibold text-gray-800 dark:text-slate-200 text-sm mb-1">{stat.label}</div>
                <p className="text-gray-500 dark:text-slate-400 text-xs">{stat.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Testimonials */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <motion.h3
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold text-gray-900 dark:text-white"
              style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
            >
              What Our <span className="gradient-text">Students Say</span>
            </motion.h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                className="p-2 rounded-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                className="p-2 rounded-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white dark:from-slate-950 to-transparent z-10 pointer-events-none" />
            <div
              className="overflow-x-scroll scrollbar-hide pb-4"
              ref={scrollContainerRef}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setTimeout(() => setIsPaused(false), 1500)}
            >
              <div className="flex py-4 px-4 gap-5 min-w-max">
                {[...testimonials, ...testimonials].map((t, index) => (
                  <div
                    key={index}
                    className="relative glass dark:bg-slate-900/40 rounded-3xl shadow-xl p-7 min-w-[320px] max-w-[360px] flex-shrink-0 flex flex-col gap-5 hover:shadow-2xl transition-all duration-300 border border-white/40 dark:border-slate-850"
                  >
                    {/* Gradient accent bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${t.color}`} />

                    <Quote className="h-7 w-7 text-gray-200 dark:text-slate-800 absolute top-5 right-5" />

                    {/* Stars */}
                    <div className="flex gap-0.5 mt-1">
                      {Array(t.rating).fill(0).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-current" />
                      ))}
                    </div>

                    <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed italic flex-1">
                      &ldquo;{t.content}&rdquo;
                    </p>

                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                      <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white text-xs font-bold">
                          {t.name.split(' ').slice(-1)[0]?.[0] ?? 'A'}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-slate-950 to-transparent z-10 pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Stats;
