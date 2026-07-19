import { state, API_BASE_URL, PROTO_VERSION } from './config';
import { elements, addMessage, adjustTextareaHeight, hideWelcomeScreen, showWelcomeScreen, showTypingDots, removeTypingDots, formatHistoryDateTime, scrollToBottom, showAgentConnectedCard } from './ui';
import { makeAuthenticatedRequest, fetchMessagesFromBackend } from './api';
import { initializeSocket, setAiResponding } from './socket';
import { stripMarkdown } from './utils/markdown';

function clearWidgetStateChrome() {
  document.getElementById('conversationStateBanner')?.remove();
  document.getElementById('conv-closed-banner')?.remove();
  document.getElementById('vx-outcome-overlay')?.remove();
  document.documentElement.classList.remove('is-history-open');
  document.body.classList.remove('is-history-open');
  const inputArea = document.querySelector('.input-area') as HTMLElement | null;
  if (inputArea) inputArea.style.display = '';
  const chatInputBox = document.getElementById('chatInputBox');
  if (chatInputBox) chatInputBox.style.display = '';
}

function setHistoryMode(active: boolean) {
  if (elements.historyOverlay) elements.historyOverlay.style.display = active ? 'flex' : 'none';
  document.documentElement.classList.toggle('is-history-open', active);
  document.body.classList.toggle('is-history-open', active);

  const inputArea = document.querySelector('.input-area') as HTMLElement | null;
  if (inputArea) inputArea.style.display = active ? 'none' : '';

  if (!active && elements.historySearch) elements.historySearch.value = '';
}

function setComposerEnabled(enabled: boolean, placeholder?: string) {
  const inputArea = document.querySelector('.input-area') as HTMLElement | null;
  if (inputArea) inputArea.classList.toggle('is-disabled', !enabled);

  if (elements.messageInput) {
    elements.messageInput.disabled = !enabled;
    if (placeholder) elements.messageInput.placeholder = placeholder;
  }

  if (elements.sendBtn) {
    elements.sendBtn.classList.remove('is-processing');
    elements.sendBtn.setAttribute('aria-busy', 'false');
    if (!enabled) {
      elements.sendBtn.disabled = true;
    } else {
      elements.sendBtn.disabled = !elements.messageInput?.value.trim();
    }
  }
}

function getBannerIcon(stateType: 'human' | 'closed' | 'resolved'): string {
  switch (stateType) {
    case 'human':
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    case 'resolved':
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    case 'closed':
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    default:
      return '';
  }
}

function showStateBanner(stateType: 'human' | 'closed' | 'resolved', title: string, subtitle?: string) {
  const topbar = document.querySelector('.widget-topbar');
  if (!topbar) return;

  let banner = document.getElementById('conversationStateBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'conversationStateBanner';
    banner.className = 'conversation-state-banner';
    topbar.insertAdjacentElement('afterend', banner);
  }

  banner.className = `conversation-state-banner state-${stateType}`;
  const iconHtml = getBannerIcon(stateType);

  banner.innerHTML = `
    <div class="state-banner-inner" style="display: flex; gap: 12px; align-items: flex-start;">
      ${iconHtml ? `<div class="state-icon-wrapper" style="flex-shrink: 0; margin-top: 1px;">${iconHtml}</div>` : ''}
      <div class="state-content" style="flex-grow: 1; text-align: left;">
        <div class="state-main" style="display: flex; align-items: center; gap: 8px;">
          <span class="state-title">${title}</span>
        </div>
        ${subtitle ? `<div class="state-subtitle">${subtitle}</div>` : ''}
      </div>
    </div>
  `;
}

function showOutcomePanel(_status: 'closed') {
  const messagesContainer = elements.messagesContainer;
  if (!messagesContainer) return;

  document.getElementById('conv-closed-banner')?.remove();

  const panel = document.createElement('div');
  panel.className = 'conv-outcome-panel closed';
  panel.id = 'conv-closed-banner';
  panel.innerHTML = `
    <div class="outcome-icon">🔒</div>
    <div class="outcome-content">
      <div class="outcome-title">Conversation closed</div>
      <div class="outcome-sub">You can start a fresh chat anytime if you need more help.</div>
    </div>
    <button class="outcome-cta" id="bannerNewChatBtn">Start new chat</button>
  `;

  messagesContainer.appendChild(panel);
  scrollToBottom();
  document.getElementById('bannerNewChatBtn')?.addEventListener('click', startNewConversation, { once: true });
}

function applyConversationVisualStateFromHistory(conversation: any) {
  const status = (conversation?.status || 'open').toLowerCase();

  if (status === 'closed' || status === 'resolved') {
    showStateBanner(status, `Conversation ${status}`, `Start a new chat if you need more help`);
    setComposerEnabled(false, `Conversation ${status}. Start a new chat.`);
    showOutcomeOverlay(status as 'closed' | 'resolved');
    return;
  }

  if (state._escalationShown) {
    const agent = conversation?.assignedAgent || conversation?.assignedTo;
    const name = typeof agent === 'object' && agent?.name ? agent.name : (typeof agent === 'string' && agent ? agent : null);
    if (name) {
      showStateBanner('human', 'Live human support connected', `You are now chatting with ${name}`);
      setComposerEnabled(true, `Reply to ${name}...`);
    } else {
      showStateBanner('human', 'Connecting with support', 'Our team will be with you shortly...');
      setComposerEnabled(true, 'Reply to support...');
    }
    return;
  }

  setComposerEnabled(true, 'Type your message...');
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSelectedDate(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return 'Choose a date';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function closeSelectControl(control: Element) {
  const trigger = control.querySelector('.vx-select-trigger');
  const menu = control.querySelector('.vx-select-menu') as HTMLElement | null;
  trigger?.setAttribute('aria-expanded', 'false');
  trigger?.classList.remove('is-open');
  if (menu) menu.hidden = true;
}

function closeDateControl(control: Element) {
  const trigger = control.querySelector('.vx-date-trigger');
  const calendar = control.querySelector('.vx-calendar') as HTMLElement | null;
  trigger?.setAttribute('aria-expanded', 'false');
  trigger?.classList.remove('is-open');
  if (calendar) calendar.hidden = true;
}

function closeInteractivePopovers(container: Element, except?: Element) {
  container.querySelectorAll('.vx-select-control').forEach(control => {
    if (control !== except) closeSelectControl(control);
  });
  container.querySelectorAll('.vx-date-control').forEach(control => {
    if (control !== except) closeDateControl(control);
  });
}

function setGeneratedFieldInvalid(field: HTMLInputElement | HTMLSelectElement, invalid: boolean) {
  field.classList.toggle('is-invalid', invalid);
  if (invalid) field.setAttribute('aria-invalid', 'true');
  else field.removeAttribute('aria-invalid');

  const trigger = field.closest('.vx-select-control, .vx-date-control')
    ?.querySelector('.vx-select-trigger, .vx-date-trigger');
  trigger?.classList.toggle('is-invalid', invalid);
  if (invalid) trigger?.setAttribute('aria-invalid', 'true');
  else trigger?.removeAttribute('aria-invalid');
}

function setGeneratedFieldDisabled(field: HTMLInputElement | HTMLSelectElement, disabled: boolean) {
  field.disabled = disabled;
  const control = field.closest('.vx-select-control, .vx-date-control');
  const trigger = control?.querySelector('.vx-select-trigger, .vx-date-trigger') as HTMLButtonElement | null;
  if (trigger) trigger.disabled = disabled;
  if (control?.classList.contains('vx-select-control')) closeSelectControl(control);
  if (control?.classList.contains('vx-date-control')) closeDateControl(control);
}

function renderCalendar(control: HTMLElement) {
  const input = control.querySelector('input[data-interaone-date]') as HTMLInputElement | null;
  const monthLabel = control.querySelector('.vx-calendar-month');
  const grid = control.querySelector('.vx-calendar-grid');
  if (!input || !monthLabel || !grid) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = parseIsoDate(control.dataset.min || input.min || '');
  const selectedDate = parseIsoDate(input.value);
  const fallbackDate = minDate && minDate > today ? minDate : today;
  const viewMatch = /^(\d{4})-(\d{1,2})$/.exec(control.dataset.view || '');
  const viewDate = viewMatch
    ? new Date(Number(viewMatch[1]), Number(viewMatch[2]) - 1, 1)
    : new Date((selectedDate || fallbackDate).getFullYear(), (selectedDate || fallbackDate).getMonth(), 1);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  control.dataset.view = `${year}-${month + 1}`;
  monthLabel.textContent = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(viewDate);

  const firstVisibleDate = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(firstVisibleDate);
    date.setDate(firstVisibleDate.getDate() + index);
    const value = toIsoDate(date);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vx-calendar-day';
    button.textContent = String(date.getDate());
    button.dataset.date = value;
    button.setAttribute('aria-label', new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date));
    button.classList.toggle('is-outside', date.getMonth() !== month);
    button.classList.toggle('is-today', value === toIsoDate(today));
    button.classList.toggle('is-selected', value === input.value);
    if (minDate && date < minDate) button.disabled = true;
    fragment.appendChild(button);
  }
  grid.replaceChildren(fragment);

  const previousButton = control.querySelector('[data-calendar-action="previous-month"]') as HTMLButtonElement | null;
  if (previousButton && minDate) {
    previousButton.disabled = new Date(year, month, 0) < new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  }
}

function setDateControlValue(control: HTMLElement, value: string) {
  const input = control.querySelector('input[data-interaone-date]') as HTMLInputElement | null;
  const trigger = control.querySelector('.vx-date-trigger');
  const label = control.querySelector('.vx-date-trigger-label');
  if (!input || !trigger || !label) return;
  input.value = value;
  label.textContent = formatSelectedDate(value);
  trigger.classList.toggle('has-value', Boolean(value));
  setGeneratedFieldInvalid(input, false);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function setupEventListeners() {
  if (elements.messageInput) {
    elements.messageInput.addEventListener("input", function (this: HTMLTextAreaElement) {
      adjustTextareaHeight();
      if (elements.sendBtn) elements.sendBtn.disabled = !this.value.trim();
      handleTypingChanged(this.value);

      // Char counter update
      const charCounter = document.getElementById('charCounter');
      if (charCounter) {
        const len = this.value.length;
        charCounter.textContent = `${len}/1000`;
        charCounter.classList.toggle('is-visible', len > 0);
      }
    });

    elements.messageInput.addEventListener("keydown", function (e: KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    elements.messageInput.addEventListener('blur', () => {
      typingStop();
    });
  }


  if (elements.sendBtn) {
    elements.sendBtn.addEventListener("click", sendMessage);
  }

  if (elements.messagesContainer) {
    elements.messagesContainer.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      target.classList.remove("is-invalid");
      target.removeAttribute("aria-invalid");
      const generatedTrigger = target.closest(".vx-select-control, .vx-date-control")
        ?.querySelector(".vx-select-trigger, .vx-date-trigger");
      generatedTrigger?.classList.remove("is-invalid");
      generatedTrigger?.removeAttribute("aria-invalid");
      target.closest(".vx-rating-wrapper")?.classList.remove("is-invalid");

      if (target.classList.contains("vx-otp-box")) {
        target.value = target.value.replace(/[^0-9]/g, "");
        target.closest(".vx-otp-container")?.querySelectorAll(".vx-otp-box").forEach(box => {
          box.classList.remove("is-invalid");
          box.removeAttribute("aria-invalid");
        });
        if (target.value && target.nextElementSibling) {
          (target.nextElementSibling as HTMLInputElement).focus();
        }
      }

      if (target.classList.contains("vx-form-slider")) {
        const min = Number(target.min || 0);
        const max = Number(target.max || 100);
        const value = Number(target.value);
        const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
        target.style.setProperty("--vx-range-progress", `${progress}%`);
        const output = target.closest(".vx-form-row, .vx-slider-wrapper")?.querySelector(".vx-slider-value-output");
        if (output) output.textContent = target.value;
      }
    });

    elements.messagesContainer.addEventListener("keydown", (e) => {
      const target = e.target as HTMLInputElement;
      const key = e.key;

      const selectControl = target.closest(".vx-select-control");
      if (selectControl && key === "Escape") {
        closeSelectControl(selectControl);
        (selectControl.querySelector(".vx-select-trigger") as HTMLButtonElement | null)?.focus();
        return;
      }

      const selectOption = target.closest(".vx-select-option") as HTMLButtonElement | null;
      if (selectOption && (key === "ArrowDown" || key === "ArrowUp")) {
        e.preventDefault();
        const options = Array.from(selectControl?.querySelectorAll(".vx-select-option") || []) as HTMLButtonElement[];
        const currentIndex = options.indexOf(selectOption);
        const nextIndex = key === "ArrowDown"
          ? (currentIndex + 1) % options.length
          : (currentIndex - 1 + options.length) % options.length;
        options[nextIndex]?.focus();
        return;
      }

      const selectTrigger = target.closest(".vx-select-trigger") as HTMLButtonElement | null;
      if (selectTrigger && (key === "ArrowDown" || key === "ArrowUp")) {
        e.preventDefault();
        selectTrigger.click();
        const options = Array.from(selectControl?.querySelectorAll(".vx-select-option") || []) as HTMLButtonElement[];
        (key === "ArrowDown" ? options[0] : options[options.length - 1])?.focus();
        return;
      }

      const dateControl = target.closest(".vx-date-control");
      if (dateControl && key === "Escape") {
        closeDateControl(dateControl);
        (dateControl.querySelector(".vx-date-trigger") as HTMLButtonElement | null)?.focus();
        return;
      }

      if (target.classList.contains("vx-otp-box")) {
        if (key === "Backspace" && !target.value && target.previousElementSibling) {
          (target.previousElementSibling as HTMLInputElement).focus();
        }
      }
    });

    elements.messagesContainer.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const messagesContainer = e.currentTarget as HTMLElement;

      const selectTrigger = target.closest(".vx-select-trigger") as HTMLButtonElement | null;
      if (selectTrigger) {
        e.preventDefault();
        const control = selectTrigger.closest(".vx-select-control") as HTMLElement | null;
        const menu = control?.querySelector(".vx-select-menu") as HTMLElement | null;
        if (!control || !menu) return;
        const willOpen = menu.hidden;
        closeInteractivePopovers(messagesContainer, control);
        menu.hidden = !willOpen;
        selectTrigger.setAttribute("aria-expanded", String(willOpen));
        selectTrigger.classList.toggle("is-open", willOpen);
        if (willOpen) menu.scrollIntoView({ block: "nearest" });
        return;
      }

      const selectOption = target.closest(".vx-select-option") as HTMLButtonElement | null;
      if (selectOption) {
        e.preventDefault();
        const control = selectOption.closest(".vx-select-control") as HTMLElement | null;
        const select = control?.querySelector("select[data-interaone-select]") as HTMLSelectElement | null;
        const trigger = control?.querySelector(".vx-select-trigger") as HTMLButtonElement | null;
        const label = control?.querySelector(".vx-select-trigger-label");
        if (!control || !select || !trigger || !label) return;
        select.value = selectOption.dataset.value || "";
        label.textContent = selectOption.querySelector("span")?.textContent || select.value;
        trigger.classList.add("has-value");
        control.querySelectorAll(".vx-select-option").forEach(option => {
          option.setAttribute("aria-selected", String(option === selectOption));
        });
        setGeneratedFieldInvalid(select, false);
        closeSelectControl(control);
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        trigger.focus();
        return;
      }

      const dateTrigger = target.closest(".vx-date-trigger") as HTMLButtonElement | null;
      if (dateTrigger) {
        e.preventDefault();
        const control = dateTrigger.closest(".vx-date-control") as HTMLElement | null;
        const calendar = control?.querySelector(".vx-calendar") as HTMLElement | null;
        if (!control || !calendar) return;
        const willOpen = calendar.hidden;
        closeInteractivePopovers(messagesContainer, control);
        if (willOpen) renderCalendar(control);
        calendar.hidden = !willOpen;
        dateTrigger.setAttribute("aria-expanded", String(willOpen));
        dateTrigger.classList.toggle("is-open", willOpen);
        if (willOpen) calendar.scrollIntoView({ block: "nearest" });
        return;
      }

      const calendarDay = target.closest(".vx-calendar-day") as HTMLButtonElement | null;
      if (calendarDay && !calendarDay.disabled) {
        e.preventDefault();
        const control = calendarDay.closest(".vx-date-control") as HTMLElement | null;
        if (!control) return;
        setDateControlValue(control, calendarDay.dataset.date || "");
        closeDateControl(control);
        (control.querySelector(".vx-date-trigger") as HTMLButtonElement | null)?.focus();
        return;
      }

      const calendarAction = target.closest("[data-calendar-action]") as HTMLButtonElement | null;
      if (calendarAction) {
        e.preventDefault();
        const control = calendarAction.closest(".vx-date-control") as HTMLElement | null;
        if (!control) return;
        const action = calendarAction.dataset.calendarAction;
        if (action === "previous-month" || action === "next-month") {
          const viewMatch = /^(\d{4})-(\d{1,2})$/.exec(control.dataset.view || "");
          const viewDate = viewMatch
            ? new Date(Number(viewMatch[1]), Number(viewMatch[2]) - 1, 1)
            : new Date();
          viewDate.setMonth(viewDate.getMonth() + (action === "next-month" ? 1 : -1));
          control.dataset.view = `${viewDate.getFullYear()}-${viewDate.getMonth() + 1}`;
          renderCalendar(control);
        } else if (action === "clear") {
          setDateControlValue(control, "");
          closeDateControl(control);
          (control.querySelector(".vx-date-trigger") as HTMLButtonElement | null)?.focus();
        } else if (action === "today") {
          const minDate = parseIsoDate(control.dataset.min || "");
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          setDateControlValue(control, toIsoDate(minDate && minDate > today ? minDate : today));
          closeDateControl(control);
          (control.querySelector(".vx-date-trigger") as HTMLButtonElement | null)?.focus();
        }
        return;
      }

      if (!target.closest(".vx-select-control, .vx-date-control")) {
        closeInteractivePopovers(messagesContainer);
      }

      // Handle interactive button
      const formBtn = target.closest("[data-interaone-button]") as HTMLButtonElement | null;
      if (formBtn) {
        e.preventDefault();
        const response = formBtn.getAttribute("data-action")
          || formBtn.querySelector(".vx-card-title")?.textContent
          || formBtn.textContent
          || "";
        formBtn.disabled = true;
        sendFormResponse(response.trim());
        return;
      }

      // Handle form submit button
      const submitBtn = target.closest(".vx-form-submit") as HTMLButtonElement | null;
      if (submitBtn) {
        e.preventDefault();
        const action = submitBtn.getAttribute("data-action");
        const fieldName = submitBtn.getAttribute("data-target") || "";
        const wrapper = submitBtn.closest(".vx-interactive-form");
        if (!wrapper) return;

        if (action === "submit-input") {
          const inputEl = wrapper.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement | null;
          if (inputEl) {
            const val = inputEl.value.trim();
            if (!val) {
              inputEl.classList.add("is-invalid");
              inputEl.setAttribute("aria-invalid", "true");
              inputEl.focus();
              return;
            }
            inputEl.disabled = true;
            submitBtn.disabled = true;
            sendFormResponse(`${fieldName}: ${val}`);
          }
        } else if (action === "submit-checkbox") {
          const checkboxEl = wrapper.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement | null;
          if (checkboxEl) {
            checkboxEl.disabled = true;
            submitBtn.disabled = true;
            sendFormResponse(`${fieldName}: ${checkboxEl.checked ? "Yes" : "No"}`);
          }
        } else if (action === "submit-radio") {
          const radioEl = wrapper.querySelector(`input[name="${fieldName}"]:checked`) as HTMLInputElement | null;
          if (radioEl) {
            const radios = wrapper.querySelectorAll(`input[name="${fieldName}"]`) as NodeListOf<HTMLInputElement>;
            radios.forEach(r => r.disabled = true);
            submitBtn.disabled = true;
            sendFormResponse(`${fieldName}: ${radioEl.value}`);
          }
        } else if (action === "submit-select") {
          const selectEl = wrapper.querySelector(`select[name="${fieldName}"]`) as HTMLSelectElement | null;
          if (selectEl) {
            const val = selectEl.value;
            if (!val) {
              setGeneratedFieldInvalid(selectEl, true);
              (selectEl.closest(".vx-select-control")?.querySelector(".vx-select-trigger") as HTMLButtonElement | null)?.focus();
              return;
            }
            setGeneratedFieldInvalid(selectEl, false);
            setGeneratedFieldDisabled(selectEl, true);
            submitBtn.disabled = true;
            sendFormResponse(`${fieldName}: ${val}`);
          }
        } else if (action === "submit-date") {
          const dateEl = wrapper.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement | null;
          if (dateEl) {
            const val = dateEl.value;
            if (!val) {
              setGeneratedFieldInvalid(dateEl, true);
              (dateEl.closest(".vx-date-control")?.querySelector(".vx-date-trigger") as HTMLButtonElement | null)?.focus();
              return;
            }
            setGeneratedFieldInvalid(dateEl, false);
            setGeneratedFieldDisabled(dateEl, true);
            submitBtn.disabled = true;
            sendFormResponse(`${fieldName}: ${val}`);
          }
        } else if (action === "submit-slider") {
          const sliderEl = wrapper.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement | null;
          if (sliderEl) {
            const val = sliderEl.value;
            sliderEl.disabled = true;
            submitBtn.disabled = true;
            sendFormResponse(`${fieldName}: ${val}`);
          }
        } else if (action === "submit-rating") {
          const ratingEl = wrapper.querySelector(`input[name="${fieldName}"]:checked`) as HTMLInputElement | null;
          if (ratingEl) {
            const val = ratingEl.value;
            const radios = wrapper.querySelectorAll(`input[name="${fieldName}"]`) as NodeListOf<HTMLInputElement>;
            radios.forEach(r => r.disabled = true);
            submitBtn.disabled = true;
            sendFormResponse(`${fieldName}: ${val}`);
          } else {
            wrapper.classList.add("is-invalid");
            (wrapper.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement | null)?.focus();
          }
        } else if (action === "submit-otp") {
          const otpContainer = wrapper.querySelector(`[data-interaone-otp][name="${fieldName}"]`) as HTMLElement | null;
          if (otpContainer) {
            const boxes = otpContainer.querySelectorAll(".vx-otp-box") as NodeListOf<HTMLInputElement>;
            let otpVal = "";
            boxes.forEach(b => {
              otpVal += b.value;
            });
            if (otpVal.length < boxes.length) {
              boxes.forEach(b => {
                b.classList.add("is-invalid");
                b.setAttribute("aria-invalid", "true");
              });
              Array.from(boxes).find(b => !b.value)?.focus();
              return;
            }
            boxes.forEach(b => {
              b.classList.remove("is-invalid");
              b.removeAttribute("aria-invalid");
              b.disabled = true;
            });
            submitBtn.disabled = true;
            sendFormResponse(`${fieldName}: ${otpVal}`);
          }
        } else if (action === "submit-group-form") {
          const formEl = submitBtn.closest("form[data-interaone-form]") as HTMLFormElement | null;
          if (formEl) {
            const inputs = formEl.querySelectorAll("input[data-interaone-input]") as NodeListOf<HTMLInputElement>;
            const checkboxes = formEl.querySelectorAll("input[data-interaone-checkbox]") as NodeListOf<HTMLInputElement>;
            const checkedRadios = formEl.querySelectorAll("input[data-interaone-radio]:checked") as NodeListOf<HTMLInputElement>;
            const selects = formEl.querySelectorAll("select[data-interaone-select]") as NodeListOf<HTMLSelectElement>;
            const dates = formEl.querySelectorAll("input[data-interaone-date]") as NodeListOf<HTMLInputElement>;
            const sliders = formEl.querySelectorAll("input[data-interaone-slider]") as NodeListOf<HTMLInputElement>;
            const checkedRatings = formEl.querySelectorAll("input[data-interaone-rating]:checked") as NodeListOf<HTMLInputElement>;
            const otps = formEl.querySelectorAll("[data-interaone-otp]") as NodeListOf<HTMLElement>;

            const responses: string[] = [];
            let hasEmptyInput = false;

            inputs.forEach(input => {
              const val = input.value.trim();
              if (!val) {
                hasEmptyInput = true;
                input.classList.add("is-invalid");
                input.setAttribute("aria-invalid", "true");
              } else {
                input.classList.remove("is-invalid");
                input.removeAttribute("aria-invalid");
                responses.push(`${input.name}: ${val}`);
              }
            });

            selects.forEach(sel => {
              const val = sel.value;
              if (!val) {
                hasEmptyInput = true;
                setGeneratedFieldInvalid(sel, true);
              } else {
                setGeneratedFieldInvalid(sel, false);
                responses.push(`${sel.name}: ${val}`);
              }
            });

            dates.forEach(d => {
              const val = d.value;
              if (!val) {
                hasEmptyInput = true;
                setGeneratedFieldInvalid(d, true);
              } else {
                setGeneratedFieldInvalid(d, false);
                responses.push(`${d.name}: ${val}`);
              }
            });

            otps.forEach(otp => {
              const name = otp.getAttribute("name") || "";
              const boxes = otp.querySelectorAll(".vx-otp-box") as NodeListOf<HTMLInputElement>;
              const val = Array.from(boxes).map(box => box.value).join("");
              if (val.length < boxes.length) {
                hasEmptyInput = true;
                boxes.forEach(box => {
                  box.classList.add("is-invalid");
                  box.setAttribute("aria-invalid", "true");
                });
              } else {
                boxes.forEach(box => {
                  box.classList.remove("is-invalid");
                  box.removeAttribute("aria-invalid");
                });
                responses.push(`${name}: ${val}`);
              }
            });

            if (hasEmptyInput) {
              const firstInvalidTrigger = formEl.querySelector(".vx-select-trigger.is-invalid, .vx-date-trigger.is-invalid") as HTMLButtonElement | null;
              firstInvalidTrigger?.focus();
              return;
            }

            checkboxes.forEach(cb => {
              responses.push(`${cb.name}: ${cb.checked ? "Yes" : "No"}`);
            });

            checkedRadios.forEach(radio => {
              responses.push(`${radio.name}: ${radio.value}`);
            });

            sliders.forEach(slide => {
              responses.push(`${slide.name}: ${slide.value}`);
            });

            checkedRatings.forEach(rating => {
              responses.push(`${rating.name}: ${rating.value}`);
            });

            otps.forEach(otp => {
              const boxes = otp.querySelectorAll(".vx-otp-box") as NodeListOf<HTMLInputElement>;
              boxes.forEach(b => b.disabled = true);
            });

            const combinedText = responses.join("\n");
            if (!combinedText) return;

            inputs.forEach(input => input.disabled = true);
            checkboxes.forEach(cb => cb.disabled = true);
            const allRadios = formEl.querySelectorAll("input[data-interaone-radio]") as NodeListOf<HTMLInputElement>;
            allRadios.forEach(r => r.disabled = true);
            selects.forEach(s => setGeneratedFieldDisabled(s, true));
            dates.forEach(d => setGeneratedFieldDisabled(d, true));
            sliders.forEach(s => s.disabled = true);
            const allRatings = formEl.querySelectorAll("input[data-interaone-rating]") as NodeListOf<HTMLInputElement>;
            allRatings.forEach(r => r.disabled = true);
            submitBtn.disabled = true;

            sendFormResponse(combinedText);
          }
        }
      }
    });
  }

  document.addEventListener("click", (e) => {
    const target = e.target as Element | null;
    if (!elements.messagesContainer || target?.closest(".vx-select-control, .vx-date-control")) return;
    closeInteractivePopovers(elements.messagesContainer);
  });


  if (elements.historyBtn && elements.historyOverlay && elements.closeHistoryBtn) {
    // Open history
    elements.historyBtn.addEventListener('click', async () => {
      setHistoryMode(true);
      renderHistoryList([]);
      renderHistoryLoading();
      try {
        const res = await makeAuthenticatedRequest(
          `${API_BASE_URL}/api/v1/widget/conversations?sessionId=${encodeURIComponent(state.currentSessionId || '')}`,
          { method: 'GET' }
        );
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        const convs: any[] = data.data?.conversations || [];
        state._historyCached = convs;
        renderHistoryList(convs);
      } catch {
        renderHistoryError();
      }
    });

    // Close / back
    elements.closeHistoryBtn.addEventListener('click', () => {
      setHistoryMode(false);
    });

    // Search filter
    elements.historyOverlay.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;
      if (target.id !== 'historySearch') return;
      const q = (target as HTMLInputElement).value.toLowerCase().trim();
      const convs: any[] = state._historyCached || [];
      renderHistoryList(q ? convs.filter((c) => {
        const preview = (c.lastMessage?.content || c.lastMessage || '').toLowerCase();
        return preview.includes(q);
      }) : convs);
    });

    // New conversation
    elements.historyOverlay.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest('#newConversationBtn');
      if (!btn) return;
      startNewConversation();
    });
  }

  if (elements.newChatBtn) {
    elements.newChatBtn.addEventListener('click', () => startNewConversation());
  }

  // (suggestion click listener removed: handled by main.ts directly on the buttons to prevent bubble conflicts)

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && window.parent) {
      window.parent.postMessage({ type: 'CLOSE_WIDGET', version: PROTO_VERSION }, state.parentOrigin || '*');
    }
  });
}

function getPageContext(): Promise<string> {
  const domAccessEnabled = state._uiConfig && state._uiConfig.features && state._uiConfig.features.endUserDomAccess;
  if (!domAccessEnabled) return Promise.resolve('');

  return new Promise(function (resolve) {
    const timeout = setTimeout(function () {
      window.removeEventListener('message', handler);
      const parts = [];
      if ((window as any).__InteraOnePageUrl) parts.push('Page URL: ' + (window as any).__InteraOnePageUrl);
      if ((window as any).__InteraOnePageTitle) parts.push('Page Title: ' + (window as any).__InteraOnePageTitle);
      resolve(parts.length ? '\\n\\n[PAGE_CONTEXT]\\n' + parts.join('\\n') : '');
    }, 600);

    function handler(event: MessageEvent) {
      if (!event.data || event.data.type !== 'PAGE_HTML_RESPONSE') return;
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
      const html = (event.data.payload && event.data.payload.html) || '';
      const parts = [];
      if ((window as any).__InteraOnePageUrl) parts.push('Page URL: ' + (window as any).__InteraOnePageUrl);
      if ((window as any).__InteraOnePageTitle) parts.push('Page Title: ' + (window as any).__InteraOnePageTitle);
      if (html) parts.push('Page Content:\\n' + html);
      resolve(parts.length ? '\\n\\n[PAGE_CONTEXT]\\n' + parts.join('\\n') : '');
    }

    window.addEventListener('message', handler);
    if (window.parent) {
      window.parent.postMessage({ type: 'REQUEST_PAGE_HTML', version: PROTO_VERSION }, '*');
    }
  });
}

async function sendMessage() {
  if (!elements.messageInput) return;
  const text = elements.messageInput.value.trim();
  if (!text) return;

  // Block sending while AI is responding
  if (state._aiResponding) return;

  if (!state.widgetToken) {
    console.warn('[InteraOneWidget] sendMessage called before token ready — ignoring');
    return;
  }

  // Lock the composer before any context/API/stream work begins, unless human support is active.
  if (!state._escalationShown) {
    setAiResponding(true);
  }
  hideWelcomeScreen();
  addMessage(text, "user", state.userName || "You", "text");
  if (!state._escalationShown) {
    showTypingDots(text);
  }
  elements.messageInput.value = "";
  adjustTextareaHeight();
  if (elements.sendBtn) elements.sendBtn.disabled = true;

  if (!state.chatId) {
    try {
      const pageContext = await getPageContext();
      const data = {
        visitorName: state.userName || undefined,
        visitorEmail: state.userEmail || undefined,
        message: text + pageContext,
        InteraOnePublicKey: state.InteraOnePublicKey,
        sessionId: state.currentSessionId,
        source: state.interactionSource || 'widget',
      };

      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/widget/conversations`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        state.chatId = result.data.conversationId;
        state.userName = data.visitorName || "";
        state.userEmail = data.visitorEmail || "";
        state.isConnected = true;

        if (!state.socket && state.widgetToken) {
          initializeSocket();
        }

        if (state.socket) {
          state.socket.emit('join_conversation', state.chatId);
          state.socket.emit('send_message', {
            conversationId: state.chatId,
            content: text + pageContext,
            type: 'text',
            metadata: {
              senderName: state.userName,
              senderEmail: state.userEmail,
              source: 'widget',
              interactionSource: state.interactionSource || 'widget'
            }
          });
          typingStop();
        }

      } else {
        removeTypingDots();
        throw new Error("Failed to create conversation");
      }
    } catch (error) {
      removeTypingDots();
      setAiResponding(false);
      console.error("Error creating conversation:", error);
    }
    return;
  }

  if (state.socket && state.chatId) {
    const pageContext = await getPageContext();
    state.socket.emit('send_message', {
      conversationId: state.chatId,
      content: text + pageContext,
      type: 'text',
      metadata: {
        senderName: state.userName,
        senderEmail: state.userEmail,
        source: 'widget',
        interactionSource: state.interactionSource || 'widget'
      }
    });
    typingStop();
  } else {
    setAiResponding(false);
  }
}

async function sendFormResponse(text: string) {
  if (state._aiResponding) return;
  if (!state.widgetToken) return;

  if (!state._escalationShown) {
    setAiResponding(true);
  }
  hideWelcomeScreen();
  addMessage(text, "user", state.userName || "You", "text");
  if (!state._escalationShown) {
    showTypingDots(text);
  }

  if (!state.chatId) {
    try {
      const pageContext = await getPageContext();
      const data = {
        visitorName: state.userName || undefined,
        visitorEmail: state.userEmail || undefined,
        message: text + pageContext,
        InteraOnePublicKey: state.InteraOnePublicKey,
        sessionId: state.currentSessionId,
        source: state.interactionSource || 'widget',
      };

      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/widget/conversations`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        state.chatId = result.data.conversationId;
        state.userName = data.visitorName || "";
        state.userEmail = data.visitorEmail || "";
        state.isConnected = true;

        if (!state.socket && state.widgetToken) {
          initializeSocket();
        }

        if (state.socket) {
          state.socket.emit('join_conversation', state.chatId);
          state.socket.emit('send_message', {
            conversationId: state.chatId,
            content: text + pageContext,
            type: 'text',
            metadata: {
              senderName: state.userName,
              senderEmail: state.userEmail,
              source: 'widget',
              interactionSource: state.interactionSource || 'widget'
            }
          });
          typingStop();
        }
      } else {
        removeTypingDots();
        setAiResponding(false);
      }
    } catch (error) {
      removeTypingDots();
      setAiResponding(false);
      console.error("Error creating conversation:", error);
    }
    return;
  }

  if (state.socket && state.chatId) {
    const pageContext = await getPageContext();
    state.socket.emit('send_message', {
      conversationId: state.chatId,
      content: text + pageContext,
      type: 'text',
      metadata: {
        senderName: state.userName,
        senderEmail: state.userEmail,
        source: 'widget',
        interactionSource: state.interactionSource || 'widget'
      }
    });
    typingStop();
  } else {
    setAiResponding(false);
  }
}


function typingStart() {
  if (!state.socket || !state.chatId) return;
  if (!state.isTyping) {
    state.socket.emit('typing_start', { conversationId: state.chatId });
    state.isTyping = true;
  }
  if (state.typingTimeout) clearTimeout(state.typingTimeout);
  state.typingTimeout = setTimeout(typingStop, 1500) as unknown as number;
}

function typingStop() {
  if (!state.socket || !state.chatId) return;
  if (state.isTyping) {
    state.socket.emit('typing_stop', { conversationId: state.chatId });
    state.isTyping = false;
  }
  if (state.typingTimeout) {
    clearTimeout(state.typingTimeout);
    state.typingTimeout = null;
  }
}

function handleTypingChanged(val: string) {
  if (!val || !val.trim()) {
    typingStop();
  } else {
    typingStart();
  }
}

// ── History helpers ────────────────────────────────────────────────────

function renderHistoryLoading() {
  if (!elements.historyList) return;
  elements.historyList.innerHTML = `
    <div class="history-state">
      <div class="history-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      </div>
      Loading conversations…
    </div>`;
}

function renderHistoryError() {
  if (!elements.historyList) return;
  elements.historyList.innerHTML = `
    <div class="history-state" style="color:#ef4444;">
      <div class="history-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      Failed to load — try again
    </div>`;
}

function renderHistoryList(convs: any[]) {
  if (!elements.historyList) return;

  if (convs.length === 0) {
    elements.historyList.innerHTML = `
      <div class="history-state">
        <div class="history-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        No conversations yet
      </div>`;
    return;
  }

  elements.historyList.innerHTML = '';

  convs.forEach((c: any) => {
    const msgRaw: string = (c.lastMessage?.content || c.lastMessage || 'No messages').trim();
    const msg = stripMarkdown(msgRaw) || msgRaw;
    const preview = msg.length > 100 ? msg.substring(0, 100) + '…' : msg;
    // Use first meaningful text as "title"
    const genericSubjects = ['new conversation from widget', 'new conversation', 'untitled conversation'];
    const subject = String(c.subject || '').trim();
    const titleRaw = subject && !genericSubjects.includes(subject.toLowerCase()) ? subject : msgRaw;
    const title = titleRaw.length > 48 ? titleRaw.substring(0, 48) + '…' : titleRaw;
    const status = (c.status || 'open').toLowerCase();
    const statusClass = status === 'closed' ? 'status-closed' : status === 'resolved' ? 'status-resolved' : 'status-open';
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    const lastUpdated = formatHistoryDateTime(c.updatedAt || c.createdAt);

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'history-item';
    el.innerHTML = `
      <div class="history-item-top">
        <div class="history-item-title">${escapeHtmlInline(title)}</div>
        <div class="history-item-status ${statusClass}">${statusLabel}</div>
      </div>
      <div class="history-item-preview">${escapeHtmlInline(preview)}</div>
      <div class="history-item-meta">
        <div class="history-item-date">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${lastUpdated}
        </div>
        <div class="history-item-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>`;

    el.addEventListener('click', () => {
      state.chatId = c._id || c.id;
      state._streamBubbleEl = null;
      state._streamMessageId = null;
      state._streamMessages.clear();
      state._completedStreamMessageIds.clear();
      clearWidgetStateChrome();
      setHistoryMode(false);
      elements.messagesContainer!.innerHTML = `
        <div class="history-state">
          <div class="history-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          </div>
          Loading chat…
        </div>`;
      hideWelcomeScreen();
      state.isConnected = true;
      if (state.socket) state.socket.emit('join_conversation', state.chatId);

      // Restore escalation badge if this conversation was escalated to a human agent
      restoreEscalationBadge(c);

      fetchMessagesFromBackend(state.chatId as string).then((msgs: any[]) => {
        elements.messagesContainer!.innerHTML = '';
        state._joinCardShown = false; // Reset to false before loop to permit rendering history join card
        msgs.forEach((m: any) => {
          const isUser = m.sender === 'visitor' || m.sender === 'user' || m.role === 'user';
          if (!isUser && (m.metadata?.source === 'web' || m.metadata?.source === 'agent')) {
            showAgentConnectedCard(m.metadata?.senderName || 'Support Agent');
          }
          addMessage(m.content, isUser ? 'user' : 'agent', m.metadata?.senderName || 'Support Agent', 'text');
        });
        applyConversationVisualStateFromHistory(c);

        // Refine join card states post history load
        const agent = c.assignedAgent || c.assignedTo;
        const isEscalated = !!(c.metadata?.escalatedAt || agent);
        if (isEscalated) {
          state._escalationShown = true;
          if (agent) state._joinCardShown = true;
        } else {
          state._escalationShown = false;
          state._joinCardShown = false;
        }

        scrollToBottom();
      });
    });

    elements.historyList!.appendChild(el);
  });
}

export function startNewConversation() {
  // Close history overlay
  setHistoryMode(false);

  clearWidgetStateChrome();

  // Reset conversation state so next message creates a fresh conversation
  state.chatId = null;
  state.isConnected = false;
  state._historyCached = [];
  state._escalationShown = false;
  state._joinCardShown = false;
  state._streamBubbleEl = null;
  state._streamMessageId = null;
  state._streamMessages.clear();
  state._completedStreamMessageIds.clear();

  // Hide agent badge
  const agentBadge = document.getElementById('agentBadge');
  if (agentBadge) agentBadge.style.display = 'none';

  // Show the empty-chat welcome state and its quick suggestions.
  if (elements.messagesContainer) {
    elements.messagesContainer.innerHTML = '';
  }
  showWelcomeScreen();

  // Focus input
  setComposerEnabled(true, 'Type your message...');
  if (elements.messageInput) {
    elements.messageInput.value = '';
    elements.messageInput.focus();
  }
}

export function showOutcomeOverlay(status: 'closed' | 'resolved') {
  // 1. Hide the composer input box
  const chatInputBox = document.getElementById('chatInputBox');
  if (chatInputBox) chatInputBox.style.display = 'none';

  // 2. Remove any existing outcome overlay
  document.getElementById('vx-outcome-overlay')?.remove();

  // 3. Create the central outcome overlay element
  const overlay = document.createElement('div');
  overlay.id = 'vx-outcome-overlay';
  overlay.className = `vx-outcome-overlay ${status}`;

  const icon = status === 'closed'
    ? `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
    : `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;

  const title = status === 'closed' ? 'Conversation Closed' : 'Conversation Resolved';
  const description = status === 'closed'
    ? 'This conversation has been closed. Start a new chat if you need further assistance.'
    : 'This conversation has been resolved. You can start a new chat if you have more questions.';

  overlay.innerHTML = `
    <div class="outcome-icon-wrapper">${icon}</div>
    <div class="outcome-title">${title}</div>
    <div class="outcome-description">${description}</div>
    <button class="outcome-btn" id="overlayNewChatBtn">New Chat</button>
  `;

  // Append it to the main widget app container
  const app = document.getElementById('app');
  if (app) {
    app.appendChild(overlay);
  }

  // Bind the New Chat button handler
  document.getElementById('overlayNewChatBtn')?.addEventListener('click', () => {
    // 4. Restore composer/input box display when a new chat starts
    if (chatInputBox) chatInputBox.style.display = '';
    overlay.remove();
    startNewConversation();
  }, { once: true });
}

/**
 * Restore the agent badge UI when opening a previously-escalated conversation
 * from the history list. Checks the assignedAgent field from the conversation
 * record returned by the API.
 */
function restoreEscalationBadge(conversation: any) {
  const agent = conversation.assignedAgent || conversation.assignedTo;
  if (agent) {
    state._escalationShown = true;
    state._joinCardShown = true;
  } else {
    state._escalationShown = false;
    state._joinCardShown = false;
  }
}

/** Simple HTML escape for inline use without importing from ui.ts */
function escapeHtmlInline(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
