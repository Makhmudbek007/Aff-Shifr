// Аффинный шифр.
// Шифрование:   y = (a * x + b) mod m
// Расшифровка:  x = a^(-1) * (y - b) mod m

var alphabet = [];        // сюда загрузим буквы из abc.txt
var decryptMode = false;  // false = шифруем, true = расшифровываем

// короткая запись, чтобы не писать длинно каждый раз
function get(id) {
  return document.getElementById(id);
}

// ---------- математика ----------

// обычный % в JS даёт отрицательный результат для отрицательных чисел,
// поэтому делаем свою функцию
function mod(n, m) {
  return ((n % m) + m) % m;
}

// наибольший общий делитель (алгоритм Евклида)
function gcd(x, y) {
  while (y != 0) {
    var t = y;
    y = x % y;
    x = t;
  }
  return x;
}

// обратное число к a по модулю m: ищем такое число i, что a * i mod m = 1
function findInverse(a, m) {
  a = mod(a, m);
  for (var i = 1; i < m; i++) {
    if ((a * i) % m == 1) {
      return i;
    }
  }
  return null;
}

// ---------- загрузка алфавита ----------

function loadAlphabet() {
  return fetch("abc.txt")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("no file");
      }
      return response.text();
    })
    .then(function (text) {
      text = text.replace(/[\r\n]+/g, "");   // убираем переносы строк
      alphabet = Array.from(text);
      get("alphabet").textContent = text;
      get("alphabetNote").textContent = "Алфавит загружен из abc.txt.";
      get("lengthM").value = alphabet.length;
    })
    .catch(function () {
      alphabet = [];
      get("alphabet").textContent = "—";
      get("alphabetNote").textContent =
        "Не удалось прочитать abc.txt. Положите файл рядом с index.html " +
        "и откройте сайт по ссылке (http или https), а не двойным кликом.";
      get("lengthM").value = 0;
    });
}

// ---------- проверка ключей ----------

// возвращает текст ошибки, а если всё хорошо - пустую строку
function checkKeys(a, b, m) {
  if (m < 2) {
    return "Алфавит не загружен: в abc.txt должно быть минимум 2 символа.";
  }

  // в алфавите не должно быть одинаковых символов
  var unique = new Set(alphabet);
  if (unique.size != m) {
    return "В abc.txt есть повторяющиеся символы. Уберите их.";
  }

  if (isNaN(a) || isNaN(b)) {
    return "Введите целые числа a и b.";
  }

  // a и m должны быть взаимно простыми, иначе расшифровать не получится
  if (gcd(mod(a, m), m) != 1) {
    return "Числа a = " + a + " и m = " + m + " должны быть взаимно простыми. Выберите другое a.";
  }

  return "";
}

// ---------- шифрование и расшифровка одной буквы ----------

function encryptNumber(x, a, b, m) {
  var value = a * x + b;        // до mod (показываем в таблице)
  return { before: value, after: mod(value, m) };
}

function decryptNumber(y, inverse, b, m) {
  var value = inverse * (y - b);
  return { before: value, after: mod(value, m) };
}

// ---------- главная функция: обрабатывает весь текст ----------

function run() {
  var a = parseInt(get("keyA").value);
  var b = parseInt(get("keyB").value);
  var m = alphabet.length;
  get("lengthM").value = m;

  var errorText = checkKeys(a, b, m);
  get("error").textContent = errorText;

  if (errorText != "") {
    get("result").textContent = "";
    get("formula").textContent = "";
    get("steps").innerHTML = "";
    return;
  }

  var inverse = findInverse(a, m);
  var text = Array.from(get("inputText").value);

  // строки будущей таблицы
  var rowSymbol = [];
  var rowNumber = [];
  var rowCalc = [];
  var rowNew = [];
  var rowResult = [];

  var result = "";

  for (var i = 0; i < text.length; i++) {
    var letter = text[i];
    var x = alphabet.indexOf(letter);

    // если буквы нет в алфавите (пробел и т.д.) - оставляем как есть
    if (x == -1) {
      var shown = (letter == " ") ? "␣" : letter;
      result += letter;
      rowSymbol.push(shown);
      rowNumber.push("—");
      rowCalc.push("—");
      rowNew.push("—");
      rowResult.push(shown);
      continue;
    }

    var res;
    if (decryptMode) {
      res = decryptNumber(x, inverse, b, m);
    } else {
      res = encryptNumber(x, a, b, m);
    }

    var newLetter = alphabet[res.after];
    result += newLetter;

    rowSymbol.push(letter);
    rowNumber.push(x);
    rowCalc.push(res.before);
    rowNew.push(res.after);
    rowResult.push(newLetter);
  }

  get("result").textContent = result;

  // формула и заголовки таблицы зависят от режима
  var names;
  if (decryptMode) {
    get("formula").textContent =
      "x = " + inverse + "·(y − " + b + ") mod " + m +
      "   (обратное a⁻¹ = " + inverse + ", потому что " + a + "·" + inverse + " mod " + m + " = 1)";
    names = ["Шифр", "y", inverse + "(y−" + b + ")", "x = mod " + m, "Текст"];
  } else {
    get("formula").textContent = "y = (" + a + "·x + " + b + ") mod " + m;
    names = ["Текст", "x", a + "x+" + b, "y = mod " + m, "Шифр"];
  }

  showTable(names, [rowSymbol, rowNumber, rowCalc, rowNew, rowResult]);
}

// рисуем таблицу: names - названия строк, rows - сами данные
function showTable(names, rows) {
  var html = "";
  for (var r = 0; r < rows.length; r++) {
    html += "<tr><th>" + names[r] + "</th>";
    for (var c = 0; c < rows[r].length; c++) {
      html += "<td>" + safe(rows[r][c]) + "</td>";
    }
    html += "</tr>";
  }
  get("steps").innerHTML = html;
}

// чтобы символы вроде < не ломали страницу
function safe(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

// ---------- кнопки ----------

function setMode(isDecrypt) {
  decryptMode = isDecrypt;

  // подсвечиваем выбранную кнопку
  if (isDecrypt) {
    get("btnDecrypt").classList.add("active");
    get("btnEncrypt").classList.remove("active");
  } else {
    get("btnEncrypt").classList.add("active");
    get("btnDecrypt").classList.remove("active");
  }

  run();
}

get("btnEncrypt").onclick = function () {
  setMode(false);
};

get("btnDecrypt").onclick = function () {
  setMode(true);
};

// переносит результат в поле "Текст", чтобы сразу расшифровать
get("btnSwap").onclick = function () {
  var button = get("btnSwap");

  // перезапускаем анимацию вспышки
  button.classList.remove("flash");
  void button.offsetWidth;
  button.classList.add("flash");

  var result = get("result").textContent;
  if (result != "") {
    get("inputText").value = result;
  }
};

// ---------- Телеграм (мини-приложение) ----------

function startTelegram() {
  if (!window.Telegram || !window.Telegram.WebApp) {
    return;   // сайт открыт не в Телеграме, ничего не делаем
  }

  var tg = window.Telegram.WebApp;
  tg.ready();    // говорим Телеграму что страница загрузилась
  tg.expand();   // раскрываем на весь экран

  // берём светлую или тёмную тему из Телеграма
  if (tg.colorScheme == "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.add("light");
  }
}

// ---------- старт ----------

startTelegram();
loadAlphabet().then(run);
