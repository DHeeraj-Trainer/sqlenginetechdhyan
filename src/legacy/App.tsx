// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { generateAllDomains } from "./data/domainGenerator";
import { generateFullSqlAssignmentPacket } from "./utils/exporter";
import { sqlCommandCategories, basicQueriesSyllabus, operatorDetailsSyllabus, aggregateFunctionsSyllabus } from "./data/syllabus";
import { sqlChapters } from "./data/sqlDocsData";
import { SqlSandbox } from "./components/SqlSandbox";
import { DomainData } from "./types";

export default function App() {
  // Initialization of 10 interactive domains
  const [domains, setDomains] = useState<DomainData[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>("healthcare");
  const [activeMenu, setActiveMenu] = useState<string>("overview"); // overview, intro, cheatsheet, domain, pitfalls, exam, documentation
  const [selectedChapterId, setSelectedChapterId] = useState<string>("dql-deep-dive");
  const [solvedQuestions, setSolvedQuestions] = useState<string[]>([]);
  const [quizScores, setQuizScores] = useState<Record<string, number[]>>({}); // domainId -> list of selected indices
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [theme, setTheme] = useState<"light" | "dark" | any>(() => {
    const saved = localStorage.getItem("sql_bootcamp_theme");
    return (saved === "dark" || saved === "light") ? saved : "light";
  });

  // Load domains & check local storage for progress
  useEffect(() => {
    const loadedDomains = generateAllDomains();
    setDomains(loadedDomains);

    // Sync from localStorage if present
    const savedSolved = localStorage.getItem("sql_bootcamp_solved");
    if (savedSolved) setSolvedQuestions(JSON.parse(savedSolved));

    const savedScores = localStorage.getItem("sql_bootcamp_quizzes");
    if (savedScores) setQuizScores(JSON.parse(savedScores));
  }, []);

  // Update localStorage when theme switches
  useEffect(() => {
    localStorage.setItem("sql_bootcamp_theme", theme);
  }, [theme]);

  const handleQuestionSolved = (qId: string) => {
    if (!solvedQuestions.includes(qId)) {
      const updated = [...solvedQuestions, qId];
      setSolvedQuestions(updated);
      localStorage.setItem("sql_bootcamp_solved", JSON.stringify(updated));
    }
  };

  const handleQuizAnswer = (domainId: string, qIdx: number, optIdx: number) => {
    const domainScores = quizScores[domainId] ? [...quizScores[domainId]] : [];
    domainScores[qIdx] = optIdx;
    const updated = { ...quizScores, [domainId]: domainScores };
    setQuizScores(updated);
    localStorage.setItem("sql_bootcamp_quizzes", JSON.stringify(updated));
  };

  const handleResetProgress = () => {
    if (window.confirm("Are you sure you want to clear your current progress? This resets all solved sandbox challenges and quiz answers.")) {
      setSolvedQuestions([]);
      setQuizScores({});
      localStorage.removeItem("sql_bootcamp_solved");
      localStorage.removeItem("sql_bootcamp_quizzes");
    }
  };

  const handleDownloadPacket = () => {
    const sqlText = generateFullSqlAssignmentPacket(domains);
    const blob = new Blob([sqlText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SQL_Interactive_Training_Script.sql";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Progress metrics calculation
  const totalQuestions = domains.reduce((acc, d) => acc + d.questions.length, 0);
  const questionsProgressPercent = totalQuestions > 0 ? Math.round((solvedQuestions.length / totalQuestions) * 100) : 0;
  
  const activeDomain = domains.find((d) => d.id === selectedDomainId) || domains[0];

  const playgroundDomain: DomainData = {
    id: "playground",
    name: "Playground",
    icon: "Flame",
    businessScenario: "Create, manage, and execute your own custom databases, tables, indices, triggers, and views! This is your fully unconstrained, Oracle/Workbench-like interactive SQL database sandbox.",
    realWorldUse: "Database administrators and developers use sandboxes to draft schemas, test complex nested trigger queries, and trace join executions before production deployment.",
    importance: "Experimenting without rules allows you to practice DDL, DML, DQL, TCL, and complex procedural triggers safely in memory.",
    tables: [],
    questions: [],
    miniQuiz: []
  };

  // Helper dynamic Icon loader
  const renderIcon = (iconName: string, className = "w-4 h-4") => {
    const IconComp = (Icons as any)[iconName] || Icons.Database;
    return <IconComp className={className} />;
  };

  // Theme styling helpers to prevent card visual issues
  const cardBgStyle = theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800";
  const cardTitleStyle = theme === "dark" ? "text-slate-100" : "text-slate-900";
  const cardDescStyle = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const subCardBgStyle = theme === "dark" ? "bg-slate-950 border-slate-850 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700";

  return (
    <div className={`min-h-screen flex flex-col font-sans tracking-tight antialiased select-none transition-colors ${
      theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"
    }`}>
      
      {/* 1. TOP BOOTCAMP CONTROL HEADER */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-700 bg-slate-900 px-4 md:px-6 shadow-md text-white">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="Toggle Sidebar navigation map"
          >
            {sidebarOpen ? <Icons.X className="w-5 h-5" /> : <Icons.Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center space-x-2.5">
            <div className="rounded-lg bg-blue-600 p-1.5 text-white shadow-sm flex items-center justify-center">
              <Icons.Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-white md:text-base leading-none">
                SQL Interactive Training Platform
              </h1>
              <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-wider block mt-0.5">
                Full-Fledged Practice & Database Playground
              </span>
            </div>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center space-x-3 md:space-x-4">
          {/* Theme Ergonomic Toggler Switch */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-350 hover:border-slate-700 hover:text-white transition cursor-pointer flex items-center justify-center shrink-0"
            title={theme === "light" ? "Switch to Dark Mode for long sessions" : "Switch to Light Mode"}
          >
            {theme === "light" ? (
              <Icons.Moon className="w-4.5 h-4.5 text-blue-400" />
            ) : (
              <Icons.Sun className="w-4.5 h-4.5 text-amber-400" />
            )}
          </button>

          {/* Download full assignment packet SQL script asset */}
          <button
            onClick={handleDownloadPacket}
            className="bg-blue-600 hover:bg-blue-500 transition px-3.5 py-1.5 rounded-lg text-xs font-extrabold text-white flex items-center shadow-md cursor-pointer"
            title="Download full SQL Packet"
          >
            <Icons.Download className="w-3.5 h-3.5 md:mr-1.5" />
            <span className="hidden md:inline">Download SQL Script</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* 2. COLLAPSIBLE LEFT SIDEBAR NAVIGATOR */}
        <aside
          className={`${
            sidebarOpen ? "w-72" : "w-0"
          } shrink-0 bg-slate-800 border-r border-slate-700 overflow-y-auto transition-all duration-300 flex flex-col`}
          id="course-sidebar-navigation"
        >
          {sidebarOpen && (
            <div className="p-4 flex-1 flex flex-col space-y-6 text-slate-350">
              
              {/* Overall Progress Tracker Widget */}
              <div className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono block">
                  Overall Completion Progress
                </span>

                {/* Sandbox Practice Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300 font-bold">Challenges Solved</span>
                    <span className="text-slate-200 font-mono font-bold">{solvedQuestions.length} / {totalQuestions}</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${questionsProgressPercent}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block mt-1">
                    Solve challenges in any of the 10 domains to build your portfolio.
                  </span>
                </div>
              </div>

              {/* SECTION: AGENDA CHECKLIST */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono pl-1">
                  KNOWLEDGE HUB
                </span>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveMenu("overview")}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition flex items-center justify-between ${
                      activeMenu === "overview" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-700/40 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center">
                      <Icons.ClipboardCheck className="w-4 h-4 mr-2.5 text-blue-400 shrink-0" />
                      Platform Overview
                    </span>
                  </button>
                   <button
                    onClick={() => setActiveMenu("intro")}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition flex items-center justify-between ${
                      activeMenu === "intro" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-700/40 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center">
                      <Icons.BookOpen className="w-4 h-4 mr-2.5 text-blue-400 shrink-0" />
                      1. SQL Core Architecture
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveMenu("cheatsheet")}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition flex items-center justify-between ${
                      activeMenu === "cheatsheet" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-700/40 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center">
                      <Icons.Terminal className="w-4 h-4 mr-2.5 text-blue-400 shrink-0" />
                      2. Command Taxonomy & Syntax
                    </span>
                  </button>
                </div>
              </div>

              {/* SECTION: SQL WORKBENCH PLAYGROUND */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-purple-400 uppercase tracking-widest block font-mono pl-1 flex items-center">
                  <Icons.Flame className="w-3.5 h-3.5 mr-1 text-purple-400 animate-pulse shrink-0" />
                  SQL WORKBENCH
                </span>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveMenu("playground")}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition flex items-center justify-between ${
                      activeMenu === "playground" ? "bg-purple-900/55 text-white border-l-2 border-purple-500 shadow-xs" : "text-slate-400 hover:bg-slate-700/40 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center">
                      <Icons.Database className="w-4 h-4 mr-2.5 text-purple-400 shrink-0" />
                      Open SQL Playground
                    </span>
                    <span className="text-[8.5px] uppercase font-mono px-1.5 py-0.25 bg-purple-500/25 text-purple-305 rounded font-bold animate-pulse">Unlocked</span>
                  </button>
                </div>
              </div>

              {/* COMPLETE REFERENCE MANUAL CHAPTERS */}
              <div className="space-y-1.5 bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/30">
                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest block font-mono pl-1 flex items-center">
                  <Icons.BookOpen className="w-3.5 h-3.5 mr-1.5 shrink-0 text-emerald-400" />
                  REFERENCE MANUAL
                </span>
                <div className="space-y-0.5 pl-0.5">
                  {sqlChapters.map((chap) => {
                    const isSelected = activeMenu === "documentation" && selectedChapterId === chap.id;
                    return (
                      <button
                        key={chap.id}
                        onClick={() => {
                          setActiveMenu("documentation");
                          setSelectedChapterId(chap.id);
                        }}
                        className={`w-full text-left text-[11px] px-2 py-1.5 rounded-lg transition flex items-center ${
                          isSelected 
                            ? "bg-emerald-950/60 text-emerald-300 font-bold border-l-2 border-emerald-500 pl-2" 
                            : "text-slate-400 hover:bg-slate-700/40 hover:text-white font-medium"
                        }`}
                      >
                        <Icons.ChevronRight className="w-3 h-3 mr-1 text-emerald-500 shrink-0" />
                        <span className="truncate">{chap.title.replace(/^\d+\.\s+/, "")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: 10 TRAINING DOMAIN PORTALS */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono pl-1">
                  3. INTERACTIVE DOMAINS (10)
                </span>
                <div className="space-y-1 select-text">
                  {domains.map((dom, idx) => {
                    const isSelected = activeMenu === "domain" && selectedDomainId === dom.id;
                    const solvedCount = dom.questions.filter(q => solvedQuestions.includes(q.id)).length;
                    
                    return (
                      <button
                        key={dom.id}
                        onClick={() => {
                          setActiveMenu("domain");
                          setSelectedDomainId(dom.id);
                        }}
                        className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition flex items-center justify-between ${
                          isSelected ? "bg-blue-900/40 text-blue-200 border-l-2 border-blue-400" : "text-slate-405 hover:bg-slate-700/40 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center min-w-0">
                          <span className="text-[10px] font-mono font-bold text-slate-500 mr-2 shrink-0">{String(idx + 1).padStart(2, "0")}</span>
                          <span className="shrink-0 mr-2 text-blue-450">{renderIcon(dom.icon, "w-3.5 h-3.5")}</span>
                          <span className="truncate">{dom.name} Domain</span>
                        </span>
                        
                        {solvedCount > 0 && (
                          <span className={`text-[9px] px-1.5 rounded-full shrink-0 font-bold ${
                            solvedCount === dom.questions.length ? "bg-emerald-950 text-emerald-400" : "bg-slate-900 text-slate-350"
                          }`}>
                            {solvedCount}/{dom.questions.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: EXTRA REQUISITE SECTIONS */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono pl-1">
                  REQUISITES & CHECKS
                </span>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveMenu("pitfalls")}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition flex items-center justify-between ${
                      activeMenu === "pitfalls" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-700/40 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center">
                      <Icons.AlertTriangle className="w-4 h-4 mr-2.5 text-blue-400 shrink-0" />
                      Gotchas & Best Practices
                    </span>
                  </button>
                  <button
                    onClick={handleResetProgress}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition text-rose-450 hover:bg-rose-950/20 flex items-center"
                  >
                    <Icons.RotateCcw className="w-4 h-4 mr-2.5 shrink-0" />
                    Reset Portal Progress
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700 text-[10px] text-slate-500 text-center font-mono">
                Bootcamp v1.2.0 Complete
              </div>
            </div>
          )}
        </aside>

        {/* 3. CORE DISPLAY WORKSPACE CANVAS */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 transition-colors ${
          theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"
        }`} id="core-display-panel">
          
          {/* =========================================
              VIEW I: SESSION OVERVIEW AND CHECKLISTS
             ========================================= */}
          {activeMenu === "overview" && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in select-text">
              <div className={`rounded-xl p-6 border shadow-sm relative overflow-hidden transition-colors ${cardBgStyle}`}>
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border shadow-3xs ${
                  theme === "dark" ? "bg-blue-955/40 text-blue-300 border-blue-900/50" : "bg-blue-50 text-blue-700 border-blue-105"
                }`}>
                  Interactive Platform
                </span>
                <h2 className={`text-2xl md:text-3xl font-extrabold mt-4 tracking-tight leading-tight ${cardTitleStyle}`}>
                  Enterprise SQL Practice & Sandbox Platform
                </h2>
                <p className={`text-sm mt-2 max-w-2xl leading-relaxed ${cardDescStyle}`}>
                  Welcome to the ultimate professional-grade SQL training suite! This platform is a fully interactive development workspace designed to let you build schemas, execute complex data manipulations, and analyze business scenarios across multiple realistic domains.
                </p>
              </div>

              {/* All-Commands Reference Guide */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-bold ${cardTitleStyle}`}>ANSI SQL Command Group & Playground Capabilities</h3>
                  <span className={`text-xs font-mono ${cardDescStyle}`}>(All operations are fully unlocked and runnable in-memory)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DDL & DML */}
                  <div className={`border rounded-xl p-5 space-y-4 shadow-xs transition-colors ${cardBgStyle}`}>
                    <span className="text-xs font-bold text-blue-500 block font-mono uppercase">1. Schema Definition & Records (DDL / DML)</span>
                    <p className={`text-xs leading-relaxed ${cardDescStyle}`}>
                      You have full authority to create, alter, insert, update, or drop tables and records in real-time. Use these commands to structure your custom tables:
                    </p>
                    <div className="space-y-3">
                      <div className={`p-3 rounded-lg border ${subCardBgStyle}`}>
                        <span className="text-[11px] font-bold text-blue-500 block font-mono">CREATE TABLE (DDL)</span>
                        <code className="text-[10px] font-mono block mt-1 break-all bg-slate-900 text-slate-100 p-1 rounded">
                          CREATE TABLE custom_leads (id INT, email TEXT, score NUMBER);
                        </code>
                      </div>
                      <div className={`p-3 rounded-lg border ${subCardBgStyle}`}>
                        <span className="text-[11px] font-bold text-blue-500 block font-mono">INSERT INTO (DML)</span>
                        <code className="text-[10px] font-mono block mt-1 break-all bg-slate-900 text-slate-100 p-1 rounded">
                          INSERT INTO custom_leads (id, email, score) VALUES (1, 'user@domain.com', 92);
                        </code>
                      </div>
                      <div className={`p-3 rounded-lg border ${subCardBgStyle}`}>
                        <span className="text-[11px] font-bold text-blue-500 block font-mono">UPDATE & DELETE (DML)</span>
                        <code className="text-[10px] font-mono block mt-1 break-all bg-slate-900 text-slate-100 p-1 rounded">
                          UPDATE custom_leads SET score = 95 WHERE id = 1;
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* DQL & Joins */}
                  <div className={`border rounded-xl p-5 space-y-4 shadow-xs transition-colors ${cardBgStyle}`}>
                    <span className="text-xs font-bold text-blue-500 block font-mono uppercase">2. Advanced Querying & Joins (DQL)</span>
                    <p className={`text-xs leading-relaxed ${cardDescStyle}`}>
                      Write complex reports, group analytical counts, and connect multiple relational data points using standard select capabilities:
                    </p>
                    <div className="space-y-3">
                      <div className={`p-3 rounded-lg border ${subCardBgStyle}`}>
                        <span className="text-[11px] font-bold text-blue-500 block font-mono">JOIN OPERATIONS</span>
                        <p className="text-[11px] mb-1">Combine records from separate tables based on key relations:</p>
                        <code className="text-[10px] font-mono block break-all bg-slate-900 text-slate-100 p-1 rounded">
                          SELECT a.name, b.visit_date FROM patients a JOIN appointments b ON a.id = b.patient_id;
                        </code>
                      </div>
                      <div className={`p-3 rounded-lg border ${subCardBgStyle}`}>
                        <span className="text-[11px] font-bold text-blue-500 block font-mono">AGGREGATES & GROUP BY</span>
                        <p className="text-[11px] mb-1">Aggregate row collections into statistical summaries:</p>
                        <code className="text-[10px] font-mono block break-all bg-slate-900 text-slate-100 p-1 rounded">
                          SELECT department, COUNT(*), AVG(salary) FROM doctors GROUP BY department HAVING COUNT(*) &gt; 2;
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive platform bento features list */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 border rounded-xl shadow-xs transition-colors ${cardBgStyle}`}>
                  <Icons.Cpu className="w-5 h-5 text-blue-500 mb-2" />
                  <h4 className="text-sm font-bold">Raw SQL Sandbox Console</h4>
                  <p className={`text-xs mt-1 ${cardDescStyle}`}>
                    The sandbox uses a lightweight, standard-compliant database engine (`AlaSQL`) enabling fully client-side table definitions, insertions, and reporting.
                  </p>
                </div>
                <div className={`p-4 border rounded-xl shadow-xs transition-colors ${cardBgStyle}`}>
                  <Icons.Briefcase className="w-5 h-5 text-emerald-500 mb-2" />
                  <h4 className="text-sm font-bold">10 Industry Domain Portals</h4>
                  <p className={`text-xs mt-1 ${cardDescStyle}`}>
                    Explore structures and live records for Healthcare, Banking, Logistics, Telecom, Retail, and more. Each is isolated and preloaded.
                  </p>
                </div>
                <div className={`p-4 border rounded-xl shadow-xs transition-colors ${cardBgStyle}`}>
                  <Icons.Award className="w-5 h-5 text-amber-500 mb-2" />
                  <h4 className="text-sm font-bold">300 Dynamic Challenges</h4>
                  <p className={`text-xs mt-1 ${cardDescStyle}`}>
                    Solve up to 30 assignment queries per domain. The real-time compiler validates your outputs structures instantly against expected datasets.
                  </p>
                </div>
              </div>

              {/* Call-to-action details */}
              <div className="bg-blue-50 border border-blue-105 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                  <h4 className="text-base font-extrabold text-blue-800">Launch Your Interactive SQL Training Workspace!</h4>
                  <p className="text-xs text-blue-700 font-medium">
                    Preloaded with verified tables, column indices, syntax assistance, and download-ready schemas.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveMenu("domain");
                    setSelectedDomainId("healthcare");
                  }}
                  className="bg-blue-600 hover:bg-blue-700 transition px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  Enter Practice Domain Workspace
                </button>
              </div>
            </div>
          )}

          {/* =========================================
              VIEW II: INTRODUCTION TO SQL SLIDES
             ========================================= */}
          {activeMenu === "intro" && (
            <div className="max-w-4xl mx-auto space-y-8 select-text">
              <div className="flex items-center space-x-2.5">
                <div className="bg-blue-50 p-2 text-blue-600 rounded-lg border border-blue-100 shadow-xs">
                  <Icons.BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-slate-950 bg-slate-50">Introduction to SQL</h2>
                  <p className="text-xs text-slate-500 font-medium">Hour 1 Core theoretical concepts & command taxonomy standard</p>
                </div>
              </div>

              {/* What and Why Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-5 rounded-xl border shadow-xs transition-colors ${cardBgStyle}`}>
                  <h3 className={`font-bold flex items-center ${cardTitleStyle}`}>
                    <Icons.Info className="w-4 h-4 text-blue-500 mr-2 shrink-0" />
                    What is SQL?
                  </h3>
                  <p className={`text-xs leading-relaxed mt-2 ${cardDescStyle}`}>
                    <strong className="font-extrabold text-blue-500">SQL</strong> (Structured Query Language) is the global standard programming language designed exclusively to interact with Relational Database Management Systems (RDBMS). It allows you to create tables, write schema logic, and search/update records on the fly.
                  </p>
                  <p className={`text-xs leading-relaxed mt-2 ${cardDescStyle}`}>
                    Essentially, SQL serves as the translator between your software application and the hard storage containing raw indexes.
                  </p>
                </div>

                <div className={`p-5 rounded-xl border shadow-xs transition-colors ${cardBgStyle}`}>
                  <h3 className={`font-bold flex items-center ${cardTitleStyle}`}>
                    <Icons.TrendingUp className="w-4 h-4 text-blue-500 mr-2 shrink-0" />
                    Why SQL is Used?
                  </h3>
                  <p className={`text-xs leading-relaxed mt-2 ${cardDescStyle}`}>
                    SQL is incredibly powerful, safe, and efficient. Relational databases manage atomic transactions (guaranteeing that billing data is written or rolled back safely) and can index millions of rows in milliseconds using customized join-free indexes.
                  </p>
                  <p className={`text-xs leading-relaxed mt-2 ${cardDescStyle}`}>
                    Every major technology brand (Google, Netflix, Apple, Uber) relies on transactional SQL to handle account logins, subscriptions, maps routing, and data warehouses.
                  </p>
                </div>
              </div>

              {/* Types of Databases */}
              <div className={`p-5 rounded-xl border shadow-xs transition-colors ${cardBgStyle}`}>
                <h3 className={`font-bold flex items-center mb-4 ${cardTitleStyle}`}>
                  <Icons.Database className="w-4 h-4 text-blue-500 mr-2 shrink-0" />
                  Database Architectures: Relational vs NoSQL
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className={`p-3.5 rounded-lg border transition-colors ${subCardBgStyle}`}>
                    <span className="font-bold text-blue-500 text-xs block mb-1">1. Relational Databases (RDBMS)</span>
                    <p className={`leading-relaxed mb-2.5 ${theme === "dark" ? "text-slate-350" : "text-slate-600"}`}>
                      Organized strictly in structured rectangular grids (rows and columns) with unique primary keys matching constraints representing physical relationships.
                    </p>
                    <div className="text-[10px] font-mono font-medium text-slate-450">
                      <strong>Popular Engines:</strong> PostgreSQL, MySQL, Microsoft SQL Server, SQLite, Oracle base.
                    </div>
                  </div>
                  <div className={`p-3.5 rounded-lg border transition-colors ${subCardBgStyle}`}>
                    <span className="font-bold text-blue-500 text-xs block mb-1">2. Non-Relational (NoSQL)</span>
                    <p className={`leading-relaxed mb-2.5 ${theme === "dark" ? "text-slate-350" : "text-slate-600"}`}>
                      Leverages loose document files (JSON blocks) or key-value caches to scale clusters horizontally. It is highly optimized for chat feeds, real-time caches, or telemetry streams.
                    </p>
                    <div className="text-[10px] font-mono font-medium text-slate-450">
                      <strong>Popular Engines:</strong> MongoDB, Redis, Apache Cassandra, Firebase Firestore database.
                    </div>
                  </div>
                </div>
              </div>

              {/* SQL Statement categories */}
              <div className="space-y-4">
                <h3 className={`text-base font-bold ${cardTitleStyle}`}>SQL Commands: Classified Taxonomy Categories</h3>
                <p className={`text-xs font-medium ${cardDescStyle}`}>
                  SQL statements are grouped into five distinct command languages representing their administrative scope:
                </p>

                <div className="space-y-4">
                  {sqlCommandCategories.map((cat) => (
                    <div key={cat.category} className={`shadow-xs rounded-xl p-4 space-y-3 border transition-colors ${cardBgStyle}`}>
                      <div className={`flex items-center justify-between border-b pb-2 flex-wrap gap-2 ${theme === "dark" ? "border-slate-800" : "border-slate-100"}`}>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 font-mono font-extrabold text-xs rounded border ${
                            theme === "dark" ? "bg-blue-950/45 text-blue-300 border-blue-900/50" : "bg-blue-50 text-blue-700 border-blue-105"
                          }`}>
                            {cat.category}
                          </span>
                          <span className={`font-bold text-xs uppercase ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{cat.fullName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 italic font-mono">{cat.description}</span>
                      </div>
                      
                      {/* Tables for specific statements mapping explanations */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className={`border-b ${theme === "dark" ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-100"}`}>
                              <th className="pb-2 w-1/4">Command</th>
                              <th className="pb-2 w-1/2">Key Function Mandate</th>
                              <th className="pb-2">Standard SQL Example</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${theme === "dark" ? "divide-slate-840" : "divide-slate-100"}`}>
                            {cat.commands.map((cmd) => (
                              <tr key={cmd.name} className={`transition-colors ${theme === "dark" ? "hover:bg-slate-950/20" : "hover:bg-slate-50"}`}>
                                <td className="py-2.5 font-bold text-blue-500">{cmd.name}</td>
                                <td className={`py-2.5 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>{cmd.description}</td>
                                <td className={`py-2.5 font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{cmd.example}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini quick-quiz sandbox */}
              <div className={`p-5 rounded-xl shadow-xs border transition-colors ${cardBgStyle}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-1">Foundational Quiz Checkpoint</span>
                <h4 className={`text-sm font-bold mb-3 ${cardTitleStyle}`}>Which statement correctly represents standard DDL operations?</h4>
                <div className="space-y-2 text-xs">
                  {[
                    "INSERT INTO patients (id) VALUES (401);",
                    "CREATE TABLE log_history (log_id INT PRIMARY KEY);",
                    "SELECT * FROM physicians WHERE experience_years > 5;",
                    "REVOKE DELETE ON inventory FROM interns;"
                  ].map((opt, i) => {
                    const isCorrect = i === 1;
                    return (
                      <button
                        key={i}
                        onClick={() => alert(isCorrect ? "Correct! CREATE modifies schemas and tables structurally (DDL)." : "No, try again! Consider which command acts on schema models (DDL) vs row-based items.")}
                        className={`w-full text-left p-2.5 rounded-lg border transition cursor-pointer font-medium ${
                          theme === "dark" 
                            ? "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-205" 
                            : "bg-slate-50 border-slate-200 hover:border-slate-350 hover:bg-slate-100/50 text-slate-700"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =========================================
              VIEW III: QUERY STATEMENT CHEATSHEET
             ========================================= */}
          {activeMenu === "cheatsheet" && (
            <div className="max-w-4xl mx-auto space-y-8 select-text">
              <div className="flex items-center space-x-2.5">
                <div className="bg-blue-50 p-2 text-blue-600 rounded-lg border border-blue-100 shadow-xs">
                  <Icons.Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">Interactive Query Statement Reference Code</h2>
                  <p className="text-xs text-slate-500 font-medium">Hour 2 Quick dictionary explanations of syntax cards, stop before JOINS</p>
                </div>
              </div>

              {/* Stop Syllabus Note */}
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start space-x-3 text-red-900 shadow-xs">
                <Icons.AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong className="text-red-950 block font-bold mb-0.5">SYLLABUS BOUNDARY CHECKPOINT:</strong>
                  This foundational curriculum focuses strictly on single-table queries. Advanced concepts like <strong className="text-slate-950">JOINS, subqueries, triggers, stored procedures, or views</strong> are intentionally excluded to ensure students firmly master filtering and grouping beforehand.
                </div>
              </div>

              {/* Basic Statements list */}
              <div className="space-y-4">
                <h3 className={`text-base font-bold font-sans ${cardTitleStyle}`}>1. Core Query Statements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {basicQueriesSyllabus.map((topic) => (
                    <div key={topic.title} className={`rounded-xl p-4 space-y-2 border shadow-xs transition-colors ${cardBgStyle}`}>
                      <span className="font-extrabold text-sm text-blue-500 block tracking-tight">{topic.title}</span>
                      <p className="text-xs text-slate-400 italic">"{topic.definition}"</p>
                      
                      <div className={`p-2.5 rounded border font-mono text-[11px] transition-colors ${
                        theme === "dark" ? "bg-slate-950/70 border-slate-850 text-slate-300" : "bg-slate-50 border-slate-200/90 text-slate-800"
                      }`}>
                        <span className="block text-[8px] text-slate-500 font-bold tracking-widest uppercase mb-1 font-mono">SYNTAX</span>
                        {topic.syntax}
                      </div>

                      <div className={`p-2.5 rounded border font-mono text-[11px] transition-colors ${
                        theme === "dark" ? "bg-blue-950/20 border-blue-900/40 text-blue-200" : "bg-blue-50/45 border-blue-105 text-slate-800"
                      }`}>
                        <span className="block text-[8px] text-blue-500 font-extrabold tracking-widest uppercase mb-1 font-mono">REAL-WORLD CODE CASE</span>
                        {topic.example}
                        <span className="block text-[10px] text-slate-450 mt-1 font-sans">{topic.outputDescription}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operators Reference Table */}
              <div className="space-y-4">
                <h3 className={`text-base font-bold ${cardTitleStyle}`}>2. Operators Dictionary</h3>
                <div className={`rounded-xl p-4 overflow-x-auto border shadow-xs transition-colors ${cardBgStyle}`}>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={`font-extrabold border-b font-mono ${theme === "dark" ? "text-slate-400 border-slate-800" : "text-slate-400 border-slate-100"}`}>
                        <th className="pb-2 w-1/4">Operator</th>
                        <th className="pb-2 w-1/2">Functional Explanation</th>
                        <th className="pb-2">SQL Statement Case</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-mono text-[11px] ${theme === "dark" ? "divide-slate-840" : "divide-slate-100"}`}>
                      {operatorDetailsSyllabus.map((op) => (
                        <tr key={op.category} className={`transition-colors ${theme === "dark" ? "hover:bg-slate-950/20" : "hover:bg-slate-50"}`}>
                          <td className="py-3 font-bold text-blue-500">
                            {op.category}
                            <span className="block text-[9px] text-amber-500 mt-0.5">{op.symbols}</span>
                          </td>
                          <td className={`py-3 text-xs font-sans leading-relaxed ${theme === "dark" ? "text-slate-350" : "text-slate-650"}`}>{op.definition}</td>
                          <td className={`py-3 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                            {op.example}
                            <span className="block text-[10px] text-slate-450 font-sans mt-0.5 italic">{op.explanation}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Aggregate Functions details */}
              <div className="space-y-4">
                <h3 className={`text-base font-bold ${cardTitleStyle}`}>3. Aggregate Mathematical Functions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aggregateFunctionsSyllabus.map((agg) => (
                    <div key={agg.name} className={`rounded-xl p-4 space-y-2 border shadow-xs transition-colors ${cardBgStyle}`}>
                      <div className={`flex items-center justify-between border-b pb-1.5 ${theme === "dark" ? "border-slate-800" : "border-slate-100"}`}>
                        <span className="font-extrabold text-xs text-blue-500 font-mono">{agg.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{agg.syntax}</span>
                      </div>
                      <p className="text-xs text-slate-400 italic font-medium leading-relaxed">"{agg.definition}"</p>
                      
                      <div className={`p-2.5 rounded border font-mono text-[10px] transition-colors ${
                        theme === "dark" ? "bg-slate-955/60 border-slate-850 text-slate-300" : "bg-slate-50 border-slate-200/95 text-slate-800"
                      }`}>
                        <span className="block text-[8px] text-blue-500 font-bold uppercase mb-0.5 font-mono">EXPRESSION CLASSROOM EXAMPLE</span>
                        <code>{agg.example}</code>
                        <span className="block text-slate-450 font-sans mt-1 leading-relaxed">{agg.explanation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================
              VIEW IV: INDIVIDUAL ACTIVE DOMAIN HUB
             ========================================= */}
          {activeMenu === "domain" && (
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Domain Header Card */}
              <div className={`rounded-xl p-5 border shadow-sm relative overflow-hidden select-text transition-colors ${cardBgStyle}`}>
                <div className="flex items-start space-x-3.5">
                  <div className={`p-2.5 rounded-xl border shadow-xs transition-colors shrink-0 ${
                    theme === "dark" ? "bg-blue-950/50 text-blue-400 border-blue-900/45" : "bg-blue-50 text-blue-600 border-blue-100"
                  }`}>
                    {renderIcon(activeDomain.icon, "w-6 h-6 shrink-0")}
                  </div>
                  <div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded tracking-wider uppercase border shadow-3xs transition-colors ${
                      theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-350" : "bg-slate-100 border-slate-200 text-slate-700"
                    }`}>
                      Practice Domain Portal
                    </span>
                    <h2 className={`text-xl font-extrabold mt-1 leading-tight ${cardTitleStyle}`}>{activeDomain.name} Case Exercises</h2>
                    <p className={`text-xs mt-1.5 max-w-3xl leading-relaxed ${cardDescStyle}`}>
                      {activeDomain.businessScenario}
                    </p>
                  </div>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 border-t pt-4 text-xs leading-relaxed transition-colors ${
                  theme === "dark" ? "border-slate-800 text-slate-350" : "border-slate-100 text-slate-600"
                }`}>
                  <div>
                    <strong className={`block mb-0.5 ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>Real-World Application:</strong>
                    {activeDomain.realWorldUse}
                  </div>
                  <div>
                    <strong className={`block mb-0.5 ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>Why SQL is crucial in this Domain:</strong>
                    {activeDomain.importance}
                  </div>
                </div>
              </div>

              {/* CORE SANDBOX COMPONENT */}
              <SqlSandbox
                domain={activeDomain}
                onQuestionSolved={handleQuestionSolved}
                solvedQuestions={solvedQuestions}
                theme={theme}
              />

              {/* Mini assessments block directly under sandbox */}
              <div className={`p-5 rounded-xl space-y-4 shadow-xs border transition-colors ${cardBgStyle}`}>
                <div className={`flex items-center justify-between border-b pb-3 flex-wrap gap-2 ${
                  theme === "dark" ? "border-slate-800" : "border-slate-100"
                }`}>
                  <div>
                    <h3 className={`text-sm font-bold flex items-center uppercase ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                      <Icons.ClipboardCheck className="w-4 h-4 text-blue-550 mr-2 shrink-0" />
                      Domain Checkpoint MCQs ({activeDomain.name})
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Test your syntax comprehension after finishing the workbook challenges</p>
                  </div>
                  <span className={`text-[10px] border font-mono font-bold px-2 py-0.5 rounded transition-colors ${
                    theme === "dark" ? "bg-blue-950/30 text-blue-400 border-blue-900/40" : "bg-blue-50 text-blue-700 border-blue-105"
                  }`}>
                    Score: {Object.keys(quizScores).filter(k=>k===activeDomain.id).length ? "Answered" : "0 / 1"}
                  </span>
                </div>

                <div className="space-y-4">
                  {activeDomain.miniQuiz.map((quiz, qIdx) => {
                    const selectedIdx = quizScores[activeDomain.id]?.[qIdx];
                    const hasAnswered = selectedIdx !== undefined;

                    return (
                      <div key={qIdx} className="space-y-2 select-text">
                        <span className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-widest">Question {qIdx + 1}: {quiz.question}</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {quiz.options.map((opt, oIdx) => {
                            const isSelected = selectedIdx === oIdx;
                            const isCorrect = oIdx === quiz.correctIndex;
                            
                            let btnStyle = theme === "dark" 
                              ? "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900 cursor-pointer" 
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-350 hover:bg-slate-100/60 cursor-pointer";
                            
                            if (hasAnswered) {
                              if (isCorrect) {
                                btnStyle = theme === "dark"
                                  ? "bg-emerald-950/30 border-emerald-800 text-emerald-400 font-semibold"
                                  : "bg-emerald-50 border-emerald-250 text-emerald-800 font-semibold";
                              } else if (isSelected) {
                                btnStyle = theme === "dark"
                                  ? "bg-rose-950/30 border-rose-800 text-rose-400"
                                  : "bg-rose-50 border-rose-250 text-rose-800";
                              } else {
                                btnStyle = theme === "dark"
                                  ? "bg-slate-950/50 border-slate-900 text-slate-605 cursor-not-allowed opacity-40"
                                  : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-60";
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                disabled={hasAnswered}
                                onClick={() => handleQuizAnswer(activeDomain.id, qIdx, oIdx)}
                                className={`w-full text-left p-3 border rounded-xl transition-all ${btnStyle}`}
                              >
                                <span className="font-mono font-bold mr-2 text-slate-400">[{String.fromCharCode(65 + oIdx)}]</span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {hasAnswered && (
                          <div className={`p-3 rounded-lg text-xs leading-relaxed transition-all ${
                            selectedIdx === quiz.correctIndex 
                              ? (theme === "dark" ? "bg-emerald-950/20 border border-emerald-900/40 text-emerald-300" : "bg-emerald-50 border border-emerald-100 text-emerald-800") 
                              : (theme === "dark" ? "bg-rose-950/20 border border-rose-900/40 text-rose-350" : "bg-rose-50 border border-rose-100 text-rose-800")
                          }`}>
                            <strong className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">
                              {selectedIdx === quiz.correctIndex ? "Correct Answer!" : "Incorrect"}
                            </strong>
                            <p className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-605"}`}>{quiz.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =========================================
              VIEW IV-B: OPEN WORKBENCH PLAYGROUND
             ========================================= */}
          {activeMenu === "playground" && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
              {/* Playground Header Card */}
              <div className={`rounded-xl p-5 border shadow-sm relative overflow-hidden select-text transition-colors ${cardBgStyle}`}>
                <div className="flex items-start space-x-3.5">
                  <div className={`p-2.5 rounded-xl border shadow-xs transition-colors shrink-0 ${
                    theme === "dark" ? "bg-purple-950/50 text-purple-400 border-purple-900/45" : "bg-purple-50 text-purple-600 border-purple-100"
                  }`}>
                    <Icons.Flame className="w-6 h-6 shrink-0 text-purple-500 animate-pulse" />
                  </div>
                  <div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded tracking-wider uppercase border shadow-3xs transition-colors ${
                      theme === "dark" ? "bg-purple-950/40 text-purple-400 border-purple-900/40" : "bg-purple-50 text-purple-700 border-purple-150"
                    }`}>
                      Full SQL Workbench Sandbox
                    </span>
                    <h2 className={`text-xl font-extrabold mt-1 leading-tight ${cardTitleStyle}`}>Oracle/Workbench-like SQL Compiler Console</h2>
                    <p className={`text-xs mt-1.5 max-w-3xl leading-relaxed ${cardDescStyle}`}>
                      Welcome to your fully unlocked virtual SQL sandbox database cluster. You have complete authority to execute any and all SQL statements: create custom tables, indexes, triggers, and relational views from scratch, or choose premium schema seed templates to initialize high-fidelity tables.
                    </p>
                  </div>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 border-t pt-4 text-xs leading-relaxed transition-colors ${
                  theme === "dark" ? "border-slate-800 text-slate-350" : "border-slate-100 text-slate-600"
                }`}>
                  <div>
                    <strong className={`block mb-0.5 ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>Sandbox Directives & Scope:</strong>
                    Build anything you desire. Supports DDL schema design (CREATE TABLE/VIEW/INDEX/TRIGGER), DML writes (INSERT/UPDATE/DELETE), DQL data mining (aggregations, sorting, analytical frames), TCL transactions (BEGIN, SAVEPOINT, COMMIT, ROLLBACK), and standard single/multi-table joins.
                  </div>
                  <div>
                    <strong className={`block mb-0.5 ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>Virtual In-Memory Database Engine:</strong>
                    Changes survive throughout your active browser session. Built-in live ER schema visualization and linter maps columns and triggers automatically as you execute statements.
                  </div>
                </div>
              </div>

              {/* CORE SANDBOX COMPONENT IN PLAYGROUND MODE */}
              <SqlSandbox
                domain={playgroundDomain}
                onQuestionSolved={handleQuestionSolved}
                solvedQuestions={solvedQuestions}
                theme={theme}
              />
            </div>
          )}

          {/* =========================================
              VIEW V: GOTCHAS & BEST PRACTICES
             ========================================= */}
          {activeMenu === "pitfalls" && (
            <div className="max-w-4xl mx-auto space-y-8 select-text animate-fade-in">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-lg border shadow-xs transition-colors shrink-0 ${
                  theme === "dark" ? "bg-blue-950/50 text-blue-400 border-blue-900/45" : "bg-blue-50 text-blue-600 border-blue-105"
                }`}>
                  <Icons.AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-xl md:text-2xl font-extrabold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>Gotchas & Best Practices</h2>
                  <p className="text-xs text-slate-400 font-medium">Syllabus hour 4 checklist: debugging common student pitfalls</p>
                </div>
              </div>

              {/* Grid of gotchas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                {/* 1. Missing columns in GROUP BY */}
                <div className={`p-5 rounded-xl border shadow-xs transition-colors ${cardBgStyle} space-y-3`}>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono border ${
                    theme === "dark" ? "bg-rose-950/30 text-rose-400 border-rose-900/40" : "bg-rose-50 text-rose-750 border-rose-100"
                  }`}>
                    PITFALL 1
                  </span>
                  <h3 className={`font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>The GROUP BY Column Exception</h3>
                  <p className={`${theme === "dark" ? "text-slate-350" : "text-slate-650"}`}>
                    A universal student error is declaring columns in SELECT that are neither referenced in the GROUP BY clause nor enclosed inside aggregate parameters.
                  </p>
                  <div className={`p-3 rounded-lg font-mono text-[11px] shadow-sm transition-colors ${
                    theme === "dark" ? "bg-rose-955/20 border border-rose-900/30 text-rose-350" : "bg-rose-50 border border-rose-150 text-rose-805"
                  }`}>
                    {`-- ❌ INVALID SQL
SELECT department, name, COUNT(*) FROM doctors GROUP BY department;`}
                  </div>
                  <div className={`p-3 rounded-lg font-mono text-[11px] shadow-sm transition-colors ${
                    theme === "dark" ? "bg-emerald-955/20 border border-emerald-900/30 text-emerald-350" : "bg-emerald-50 border border-emerald-150 text-emerald-805"
                  }`}>
                    {`-- ✅ CORRECT SQL
SELECT department, COUNT(*) FROM doctors GROUP BY department;`}
                  </div>
                </div>

                {/* 2. WHERE aggregates */}
                <div className={`p-5 rounded-xl border shadow-xs transition-colors ${cardBgStyle} space-y-3`}>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono border ${
                    theme === "dark" ? "bg-rose-950/30 text-rose-400 border-rose-900/40" : "bg-rose-50 text-rose-750 border-rose-100"
                  }`}>
                    PITFALL 2
                  </span>
                  <h3 className={`font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>Using Aggregates inside WHERE clauses</h3>
                  <p className={`${theme === "dark" ? "text-slate-350" : "text-slate-650"}`}>
                    The WHERE clause evaluates individual rows before they group. To apply checks against calculated aggregations (like SUM or COUNT), you must use <strong className={`${theme === "dark" ? "text-slate-100" : "text-slate-950"} font-semibold font-mono`}>HAVING</strong>.
                  </p>
                  <div className={`p-3 rounded-lg font-mono text-[11px] shadow-sm transition-colors ${
                    theme === "dark" ? "bg-rose-955/20 border border-rose-900/30 text-rose-350" : "bg-rose-50 border border-rose-150 text-rose-805"
                  }`}>
                    {`-- ❌ INVALID SQL
SELECT city, COUNT(*) FROM patients WHERE COUNT(*) > 2 GROUP BY city;`}
                  </div>
                  <div className={`p-3 rounded-lg font-mono text-[11px] shadow-sm transition-colors ${
                    theme === "dark" ? "bg-emerald-955/20 border border-emerald-900/30 text-emerald-350" : "bg-emerald-50 border border-emerald-150 text-emerald-805"
                  }`}>
                    {`-- ✅ CORRECT SQL
SELECT city, COUNT(*) FROM patients GROUP BY city HAVING COUNT(*) > 2;`}
                  </div>
                </div>

                {/* 3. Comparing null */}
                <div className={`p-5 rounded-xl border shadow-xs transition-colors ${cardBgStyle} space-y-3`}>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono border ${
                    theme === "dark" ? "bg-rose-950/30 text-rose-400 border-rose-900/40" : "bg-rose-50 text-rose-750 border-rose-100"
                  }`}>
                    PITFALL 3
                  </span>
                  <h3 className={`font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-850"}`}>Checking for NULL using standard equals (=)</h3>
                  <p className={`${theme === "dark" ? "text-slate-350" : "text-slate-650"}`}>
                    NULL is a marker of lack of value, so mathematical operators fail. Always use <strong className={`${theme === "dark" ? "text-slate-100" : "text-slate-900"} font-semibold font-mono`}>IS NULL</strong> or <strong className={`${theme === "dark" ? "text-slate-100" : "text-slate-900"} font-semibold font-mono`}>IS NOT NULL</strong>.
                  </p>
                  <div className={`p-3 rounded-lg font-mono text-[11px] shadow-sm transition-colors ${
                    theme === "dark" ? "bg-rose-955/20 border border-rose-900/30 text-rose-350" : "bg-rose-50 border border-rose-150 text-rose-805"
                  }`}>
                    {`-- ❌ INVALID SQL
SELECT * FROM patients WHERE discharge_date = NULL;`}
                  </div>
                  <div className={`p-3 rounded-lg font-mono text-[11px] shadow-sm transition-colors ${
                    theme === "dark" ? "bg-emerald-955/20 border border-emerald-900/30 text-emerald-350" : "bg-emerald-50 border border-emerald-150 text-emerald-805"
                  }`}>
                    {`-- ✅ CORRECT SQL
SELECT * FROM patients WHERE discharge_date IS NULL;`}
                  </div>
                </div>

                {/* 4. Operator precedence */}
                <div className={`p-5 rounded-xl border shadow-xs transition-colors ${cardBgStyle} space-y-3`}>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono border ${
                    theme === "dark" ? "bg-rose-950/30 text-rose-400 border-rose-900/40" : "bg-rose-50 text-rose-750 border-rose-100"
                  }`}>
                    PITFALL 4
                  </span>
                  <h3 className={`font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-850"}`}>Operator Precedence in AND/OR logic</h3>
                  <p className={`${theme === "dark" ? "text-slate-350" : "text-slate-650"}`}>
                    SQL processes AND operators before OR, which can leading to unexpected dataset cuts. Always wrap OR groupings inside parentheses!
                  </p>
                  <div className={`p-3 rounded-lg font-mono text-[11px] shadow-sm transition-colors ${
                    theme === "dark" ? "bg-rose-955/20 border border-rose-900/30 text-rose-350" : "bg-rose-50 border border-rose-150 text-rose-805"
                  }`}>
                    {`-- ❌ LOGIC COLLISION
SELECT * FROM doctors WHERE specialty = 'Cardiology' OR specialty = 'Neurology' AND salary > 12000;`}
                  </div>
                  <div className={`p-3 rounded-lg font-mono text-[11px] shadow-sm transition-colors ${
                    theme === "dark" ? "bg-emerald-955/20 border border-emerald-900/30 text-emerald-350" : "bg-emerald-50 border border-emerald-150 text-emerald-805"
                  }`}>
                    {`-- ✅ ACCURATE PRECISION
SELECT * FROM doctors WHERE (specialty = 'Cardiology' OR specialty = 'Neurology') AND salary > 12000;`}
                  </div>
                </div>
              </div>
                     {/* Best practices checklist */}
              <div className={`p-5 rounded-xl border shadow-xs transition-colors ${cardBgStyle} space-y-4`}>
                <h3 className={`text-base font-bold ${theme === "dark" ? "text-slate-150" : "text-slate-800"}`}>Professional Query Style Guidelines</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                  <li className={`flex items-start space-x-2 p-3 rounded-xl border shadow-xs transition-colors ${subCardBgStyle}`}>
                    <Icons.CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className={`block mb-0.5 font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>Uppercase Reserved SQL Keywords</strong>
                      Keep syntax cleaner by typing SELECT, WHERE, ORDER BY, GROUP BY in uppercase, and column names in lowercase.
                    </div>
                  </li>
                  <li className={`flex items-start space-x-2 p-3 rounded-xl border shadow-xs transition-colors ${subCardBgStyle}`}>
                    <Icons.CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className={`block mb-0.5 font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>Meaningful Column Aliases</strong>
                      Always declare simple readable alias handles (using AS) when writing math formulas or averages.
                    </div>
                  </li>
                  <li className={`flex items-start space-x-2 p-3 rounded-xl border shadow-xs transition-colors ${subCardBgStyle}`}>
                    <Icons.CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className={`block mb-0.5 font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>Query Comments Format</strong>
                      Keep scripts documentation rich. Use double hyphens (-- Comment) before specific code blocks.
                    </div>
                  </li>
                  <li className={`flex items-start space-x-2 p-3 rounded-xl border shadow-xs transition-colors ${subCardBgStyle}`}>
                    <Icons.CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className={`block mb-0.5 font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>Always Indent Complex Clauses</strong>
                      Break queries onto separate lines (SELECT, FROM, WHERE, GROUP BY, ORDER BY) to help peers read code models.
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* =========================================
              VIEW VI: COMPREHENSIVE REFERENCE BOOK
             ========================================= */}
          {activeMenu === "documentation" && (() => {
            const currentChapter = sqlChapters.find(c => c.id === selectedChapterId) || sqlChapters[0];
            return (
              <div className="max-w-4xl mx-auto space-y-8 select-text animate-fade-in pb-12">
                {/* Chapter Title Banner */}
                <div className={`rounded-xl p-6 border shadow-sm relative overflow-hidden transition-colors ${cardBgStyle}`}>
                  <div className="flex items-center space-x-2.5 mb-2">
                    <span className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider border border-emerald-500/20">
                      Standard Reference Guide
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Verified Production Standards</span>
                  </div>
                  <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight leading-tight ${cardTitleStyle}`}>
                    {currentChapter.title}
                  </h2>
                  <p className={`text-xs font-mono mt-1 text-slate-400 font-bold uppercase tracking-wider`}>
                    {currentChapter.subtitle}
                  </p>
                  <p className={`text-sm mt-3 leading-relaxed ${cardDescStyle}`}>
                    {currentChapter.description}
                  </p>
                </div>

                {/* Iterate Chapter Sections */}
                {currentChapter.sections.map((section, sIdx) => (
                  <div key={sIdx} className={`rounded-xl p-5 border shadow-xs space-y-4 transition-colors ${cardBgStyle}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 dark:border-slate-800 border-slate-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <h3 className={`font-bold text-base ${cardTitleStyle}`}>{section.title}</h3>
                    </div>
                    
                    <p className={`text-xs leading-relaxed ${cardDescStyle}`}>
                      {section.description}
                    </p>

                    {/* Syntax Highlight Box */}
                    {section.syntax && (
                      <div className={`p-3.5 rounded-lg border font-mono text-[11px] transition-colors ${subCardBgStyle}`}>
                        <span className="block text-[8px] text-slate-500 font-bold tracking-widest uppercase mb-1.5">ANSI SYNTAX MODEL</span>
                        <pre className="whitespace-pre-wrap break-all leading-relaxed">{section.syntax}</pre>
                      </div>
                    )}

                    {/* Code Case Example Box */}
                    {section.example && (
                      <div className={`p-3.5 rounded-lg border font-mono text-[11px] transition-colors ${
                        theme === "dark" ? "bg-blue-950/20 border-blue-900/40 text-blue-200" : "bg-blue-50/45 border-blue-105 text-slate-800"
                      }`}>
                        <span className="block text-[8px] text-blue-500 font-extrabold tracking-widest uppercase mb-1.5">REAL-WORLD PRODUCTION CODE</span>
                        <pre className="whitespace-pre-wrap break-all leading-relaxed">{section.example}</pre>
                      </div>
                    )}

                    {/* Dynamic Table Rendering (Exhaustive Explanations/Training Tables) */}
                    {section.tableData && (
                      <div className={`border rounded-xl overflow-hidden transition-colors ${
                        theme === "dark" ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50/35"
                      }`}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className={`border-b font-mono font-bold uppercase text-[9px] tracking-wider ${
                                theme === "dark" ? "bg-slate-900 text-slate-400 border-slate-800" : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}>
                                {section.tableData.headers.map((h, hIdx) => (
                                  <th key={hIdx} className="px-4 py-2.5">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/10 dark:divide-slate-800/60 font-mono text-[11px]">
                              {section.tableData.rows.map((row, rIdx) => (
                                <tr key={rIdx} className={`transition-colors ${
                                  theme === "dark" ? "hover:bg-slate-900/35" : "hover:bg-slate-100/50"
                                }`}>
                                  {row.map((cell, cIdx) => {
                                    // Make first column or key elements bold/blue
                                    const isFirst = cIdx === 0;
                                    return (
                                      <td key={cIdx} className={`px-4 py-3 align-top leading-relaxed ${
                                        isFirst ? "font-bold text-blue-500 dark:text-blue-400" : `${theme === "dark" ? "text-slate-300" : "text-slate-700"}`
                                      }`}>
                                        {cell}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Sections Tips */}
                    {section.tips && section.tips.length > 0 && (
                      <div className={`p-4 rounded-xl border border-dashed text-xs space-y-1.5 ${
                        theme === "dark" ? "bg-emerald-950/10 border-emerald-900/50 text-slate-300" : "bg-emerald-50/40 border-emerald-200 text-slate-700"
                      }`}>
                        <div className="flex items-center space-x-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                          <Icons.AlertCircle className="w-4 h-4 shrink-0" />
                          <span>PRO TIPS & COMPILE SAFETY:</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1">
                          {section.tips.map((tip, tIdx) => (
                            <li key={tIdx} className="leading-relaxed font-medium">{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}