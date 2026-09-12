/**
 * Waled reminder webhook.
 * Receives the raw digest from the Rust backend and turns it into a Gmail message.
 * Reminders never include amounts by design — users don't set fixed amounts for
 * periodic accounts, so the email only notifies which payments are due soon.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const recipient = data.user_email;
    if (!recipient) {
      return jsonResponse({
        status: "error",
        message: "Falta 'user_email' en el payload",
      });
    }
    if (!Array.isArray(data.reminders) || data.reminders.length === 0) {
      return jsonResponse({
        status: "skipped",
        message: "No hay recordatorios que enviar",
      });
    }

    const kindLabel = friendlyKind(data.kind);
    const subject = `Waled · ${kindLabel} (${data.reminders.length} pagos próximos)`;
    const bodyText = renderPlainText(data);
    const htmlBody = renderHtml(data, kindLabel);

    GmailApp.sendEmail(recipient, subject, bodyText, { htmlBody: htmlBody });

    return jsonResponse({
      status: "success",
      message: "Correo enviado con éxito",
      recipient: recipient,
      count: data.reminders.length,
    });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

function friendlyKind(kind) {
  switch (kind) {
    case "weekly_three_week_window":
      return "Recordatorio semanal";
    case "monthly_summary":
      return "Resumen mensual";
    case "manual":
      return "Recordatorio manual";
    default:
      return "Recordatorio";
  }
}

var MONTH_ABBR = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/** "2026-09-24" -> "24 Sep 2026" */
function formatDueDate(iso) {
  var parts = iso.split("-");
  if (parts.length !== 3) return iso;
  var year = parts[0];
  var monthIndex = parseInt(parts[1], 10) - 1;
  var day = parseInt(parts[2], 10);
  return day + " " + MONTH_ABBR[monthIndex] + " " + year;
}

function renderPlainText(data) {
  var lines = [];
  lines.push(("Hola " + (data.user_name || "")).trim() + ",");
  lines.push("");
  lines.push("Tienes " + data.reminders.length + " pagos próximos:");
  lines.push("");
  data.reminders.forEach(function (reminder) {
    lines.push(
      "- " + reminder.name +
      " (" + reminder.account_type + ")" +
      " · vence " + formatDueDate(reminder.due_date)
    );
  });
  lines.push("");
  lines.push("— Waled");
  return lines.join("\n");
}

function renderHtml(data, kindLabel) {
  // Neutral, high-contrast palette that renders consistently across
  // Gmail iOS/Android, Apple Mail, and Outlook — avoids dark-mode surprises.
  var C = {
    outerBg: "#f4f5f7",       // page background
    cardBg: "#ffffff",         // card background
    border: "#e4e7eb",         // borders and separators
    textPrimary: "#111827",    // dark neutral for main text
    textSecondary: "#4b5563",  // medium neutral
    textMuted: "#6b7280",      // muted labels
    brand: "#0f7a55",          // deeper brand green with better light-mode contrast
    accent: "#f3f4f6",         // pill background
  };

  var rows = data.reminders
    .map(function (reminder) { return renderRow(reminder, C); })
    .join("");

  return (
    '<!DOCTYPE html>' +
    '<html lang="es">' +
    '<head>' +
      '<meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<meta name="color-scheme" content="light">' +
      '<meta name="supported-color-schemes" content="light">' +
      '<title>' + escapeHtml(kindLabel) + '</title>' +
    '</head>' +
    '<body style="margin:0;padding:0;background:' + C.outerBg + ';">' +

      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
        'style="background:' + C.outerBg + ';padding:24px 12px;">' +
        '<tr>' +
          '<td align="center">' +

            '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
              'width="500" ' +
              'style="max-width:500px;width:100%;background:' + C.cardBg + ';' +
                     'border:1px solid ' + C.border + ';border-radius:14px;' +
                     'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;' +
                     'color:' + C.textPrimary + ';">' +

              // Header
              '<tr>' +
                '<td style="padding:22px 24px 16px 24px;border-bottom:1px solid ' + C.border + ';">' +
                  '<div style="font-size:20px;font-weight:800;color:' + C.brand + ';line-height:1;">Waled</div>' +
                  '<div style="font-size:13px;color:' + C.textMuted + ';margin-top:4px;">' +
                    escapeHtml(kindLabel) +
                  '</div>' +
                '</td>' +
              '</tr>' +

              // Greeting
              '<tr>' +
                '<td style="padding:20px 24px 8px 24px;">' +
                  '<p style="margin:0 0 6px 0;font-size:15px;color:' + C.textPrimary + ';">' +
                    'Hola ' + escapeHtml(data.user_name || "") + ',' +
                  '</p>' +
                  '<p style="margin:0;font-size:14px;color:' + C.textSecondary + ';line-height:1.5;">' +
                    'Tienes <strong style="color:' + C.textPrimary + ';">' +
                      data.reminders.length +
                    '</strong> ' +
                    (data.reminders.length === 1 ? 'pago próximo' : 'pagos próximos') +
                    ':' +
                  '</p>' +
                '</td>' +
              '</tr>' +

              // Reminders list
              '<tr>' +
                '<td style="padding:12px 16px 20px 16px;">' + rows + '</td>' +
              '</tr>' +

              // Footer
              '<tr>' +
                '<td style="padding:16px 24px 22px 24px;border-top:1px solid ' + C.border + ';">' +
                  '<p style="margin:0;font-size:12px;color:' + C.textMuted + ';line-height:1.5;">' +
                    'Este recordatorio se generó automáticamente. Puedes desactivar el envío ' +
                    'quitando el webhook en la app o desactivando la opción “Notifica” en cada cuenta.' +
                  '</p>' +
                '</td>' +
              '</tr>' +

            '</table>' +

            '<div style="font-size:11px;color:' + C.textMuted + ';margin-top:14px;' +
                        'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">' +
              'Enviado por Waled · Control de gastos personales' +
            '</div>' +

          '</td>' +
        '</tr>' +
      '</table>' +

    '</body>' +
    '</html>'
  );
}

function renderRow(reminder, C) {
  // Each row is its own table so mobile clients wrap it as a single block.
  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
      'style="margin:6px 0;background:' + C.accent + ';border-radius:10px;">' +
      '<tr>' +
        '<td style="padding:12px 14px;">' +

          '<div style="font-size:14px;font-weight:700;color:' + C.textPrimary + ';line-height:1.3;">' +
            escapeHtml(reminder.name) +
          '</div>' +

          '<div style="font-size:12px;color:' + C.textSecondary + ';margin-top:2px;">' +
            escapeHtml(reminder.account_type) +
          '</div>' +

          '<div style="font-size:13px;color:' + C.textPrimary + ';margin-top:8px;' +
                      'font-family:-apple-system,\'SF Mono\',Menlo,Consolas,monospace;' +
                      'white-space:nowrap;">' +
            '<span style="color:' + C.textMuted + ';font-family:inherit;">Vence:</span> ' +
            '<strong style="color:' + C.textPrimary + ';">' +
              formatDueDate(reminder.due_date) +
            '</strong>' +
          '</div>' +

        '</td>' +
      '</tr>' +
    '</table>'
  );
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
