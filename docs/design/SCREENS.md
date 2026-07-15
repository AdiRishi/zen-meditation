# Moss Screen System

> **Current specification.** The [five screen boards](./screens/README.md) are the canonical visual reference for these surfaces. Copy may tighten during implementation, but the product structure and behaviours below should remain stable.

Moss uses three primary destinations: **Today**, **Progress**, and **Settings**. Meditation runs as a focused flow above that navigation.

## Onboarding

### 01 — Splash

Introduce the ensō, Moss wordmark, and tagline without controls. Fade naturally into Welcome.

### 02 — Welcome

Explain the product in one sentence: “A quieter way to keep your practice.” The single action is **Continue**.

### 03 — Practice goal

Let people choose a flexible cadence by days per week and sessions per chosen day. Keep the language about intention rather than targets.

### 04 — Schedule

Offer optional morning and evening practice times. Each time can be enabled, edited, or skipped.

### 05 — Reminders

Explain that reminders are gentle and optional before requesting notification permission. The actions are **Allow reminders** and **Not now**.

## Today

### 06 — Today

Show the next planned practice, a prominent **Begin** action, today’s completed sessions, and a small weekly rhythm. Avoid content feeds or recommendations.

### 07 — Session setup

Choose 5, 10, 15, 20, or 30 minutes. Show the selected completion sound as a quiet secondary row.

### 08 — Completion sound

Choose between a small set of restrained end signals and preview one at a time. This sound plays only when meditation ends.

## Meditation

### 09 — Active session

Show the remaining time, an extremely subtle breathing field, the end-sound label, and one pause control. No instructions, spoken guidance, or ambient audio.

### 10 — Session ending

During the final moments, soften the breathing field and change the guidance to “Gently returning.” Keep controls available but visually quiet.

### 11 — Session complete

Confirm the duration and time, acknowledge the practice without exaggerated praise, and offer **Done**. An optional feeling check may be skipped.

## Progress

### 12 — Progress overview

Show this week’s practice rhythm, total sessions, total minutes, current consistency, and a restrained trend. Emphasise return rather than perfection.

### 13 — Practice history

Provide a month calendar and chronological session list. Completed days are visible without turning missed days into failure states.

## Settings

### 14 — Schedule management

Edit the weekly cadence and planned practice times in one place.

### 15 — Reminder settings

Enable or disable reminders, edit lead time, set quiet hours, and preview the notification language.

### 16 — Settings overview

Provide access to Schedule, Reminders, Completion sound, Appearance, Reduced motion, Privacy, and About. Keep account features out of the initial product.

## System States

Every data-bearing screen should define loading, empty, offline, and error states. These states use plain language, preserve the primary action where possible, and never blame the person for missing practice.
