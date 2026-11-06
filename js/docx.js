/* ============================================================
 * Word 报告导出 (docx.js)
 * 零依赖、可离线：手写一个「不压缩」的 ZIP 写入器（ZIP stored 模式），
 * 把 OOXML（.docx 实为 ZIP 包）拼出来。Word / Pages / LibreOffice 均可打开。
 * 移植并适配自《一念之差》（Choices）的 docx 导出模块（MIT，同源项目）。
 *
 * buildDocxBytes() 读取 PolicyLab 的全局状态 G，生成与屏幕复盘、Markdown
 * 同源的本局复盘报告。
 * ============================================================ */

/* ---------- ZIP（stored，无压缩）写入器 ---------- */
var CRC_TABLE = (function () {
  var t = new Uint32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  var c = 0xFFFFFFFF;
  for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function utf8(str) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
  var out = [], i, c;
  for (i = 0; i < str.length; i++) {
    c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
    else out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
  }
  return new Uint8Array(out);
}

function zipStore(files) {
  var parts = [], central = [], offset = 0;
  files.forEach(function (f) {
    var name = utf8(f.name);
    var crc = crc32(f.data);
    var local = new Uint8Array(30 + name.length);
    var dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x0800, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0x21, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, f.data.length, true);
    dv.setUint32(22, f.data.length, true);
    dv.setUint16(26, name.length, true);
    dv.setUint16(28, 0, true);
    local.set(name, 30);
    parts.push(local, f.data);

    var cen = new Uint8Array(46 + name.length);
    var cv = new DataView(cen.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, f.data.length, true);
    cv.setUint32(24, f.data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cen.set(name, 46);
    central.push(cen);
    offset += local.length + f.data.length;
  });

  var centralSize = central.reduce(function (a, c) { return a + c.length; }, 0);
  var end = new Uint8Array(22);
  var ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  var all = parts.concat(central, [end]);
  var total = all.reduce(function (a, c) { return a + c.length; }, 0);
  var out = new Uint8Array(total), pos = 0;
  all.forEach(function (c) { out.set(c, pos); pos += c.length; });
  return out;
}

function xmlEsc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wp(text, style) {
  return '<w:p><w:pPr><w:pStyle w:val="' + (style || 'Normal') + '"/></w:pPr>' +
    '<w:r><w:t xml:space="preserve">' + xmlEsc(text) + '</w:t></w:r></w:p>';
}

function wtbl(rows) {
  var body = rows.map(function (r) {
    return '<w:tr>' + r.map(function (c) {
      return '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>' + wp(c, 'TableText') + '</w:tc>';
    }).join('') + '</w:tr>';
  }).join('');
  return '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="9638" w:type="dxa"/></w:tblPr>' +
    body + '</w:tbl>';
}

var DOCX_CT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '</Types>';

var DOCX_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>';

var DOCX_DOC_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';

function docxStyles() {
  function st(id, name, sz, bold, rpr) {
    return '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + name + '"/>' +
      '<w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr>' +
      '<w:rPr>' + (bold ? '<w:b/>' : '') + (rpr || '') +
      '<w:sz w:val="' + sz + '"/></w:rPr></w:style>';
  }
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults>' +
    st('Title', 'Title', '40', true) +
    st('Heading1', 'heading 1', '30', true) +
    st('Heading2', 'heading 2', '25', true) +
    st('Normal', 'Normal', '21', false) +
    st('Story', 'Story', '21', false, '<w:i/>') +
    st('Choice', 'Choice', '22', true) +
    st('TableText', 'Table Text', '19', false) +
    '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/>' +
    '<w:tblPr><w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) {
      return '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>';
    }).join('') + '</w:tblBorders></w:tblPr></w:style>' +
    '</w:styles>';
}

/* ---------- 组装本局复盘报告 ---------- */
function buildDocxBytes() {
  var s = getScenario();
  var res = finalResult(G.accum);
  var B = [];

  B.push(wp('科技与创新政策 · 政策实验室 · 本局复盘报告', 'Title'));
  B.push(wp(s.title + '（' + s.sector + '）', 'Heading2'));
  B.push(wp('本局政策层面：' + LEVEL_LABEL[G.level], 'Normal'));
  B.push(wp('导出时间：' + new Date().toLocaleString('zh-CN'), 'Normal'));

  // 一、政策执行结果（Matland 四象限）
  B.push(wp('一、政策执行结果（Matland 四象限）', 'Heading1'));
  B.push(wp('结局：' + res.label + '　模糊度 ' + res.avgA.toFixed(2) +
            ' / 冲突度 ' + res.avgC.toFixed(2) + ' / 执行系数 ' + res.factor.toFixed(1), 'Heading2'));
  B.push(wp(res.desc, 'Normal'));
  B.push(wp(res.narrative, 'Story'));

  // 二、决策轨迹
  B.push(wp('二、决策轨迹（按决策点）', 'Heading1'));
  G.selections.forEach(function (rec, i) {
    var info = matlandInfo(rec.ambiguity, rec.conflict);
    B.push(wp('决策点 ' + (i + 1) + ' · ' + LEVEL_LABEL[rec.level] + '（' + info.label + '）', 'Heading2'));
    B.push(wp('你的选择：' + rec.text, 'Choice'));
    B.push(wp('本步模糊度 ' + rec.ambiguity.toFixed(2) + ' / 冲突度 ' + rec.conflict.toFixed(2) +
              ' / 执行系数 ' + info.factor, 'Normal'));
    var effRows = Object.keys(rec.intended).map(function (k) {
      var v = rec.intended[k], dv = rec.effects[k];
      return [labelOf(k), (v > 0 ? '+' : '') + v, (dv > 0 ? '+' : '') + dv];
    });
    if (effRows.length) {
      B.push(wtbl([['受影响指标', '预期效果', '实际落地']].concat(effRows)));
    }
    if (rec.rationale) B.push(wp('解析：' + rec.rationale, 'Normal'));
  });
  B.push(wp('本局无任何随机数：结局完全由你的 ' + G.selections.length + ' 个选择决定。', 'Story'));

  // 三、社会发展指标总账
  B.push(wp('三、社会发展指标总账（开局 → 终局）', 'Heading1'));
  ['B', 'C', 'D'].forEach(function (mod) {
    B.push(wp(MODULE_LABEL[mod], 'Heading2'));
    var ledgerRows = [['指标', '开局 → 终局', '净变化', '推动来源']];
    INDICATORS.filter(function (ind) { return ind.module === mod; }).forEach(function (ind) {
      var init = BASELINE[ind.id];
      var finalV = G.indicators[ind.id];
      var net = finalV - init;
      var movers = G.selections
        .map(function (r, i) { return (r.effects && r.effects[ind.id] !== undefined) ? (i + 1) : null; })
        .filter(function (x) { return x !== null; });
      ledgerRows.push([
        ind.label, init + ' → ' + finalV, (net > 0 ? '+' : '') + net,
        movers.length ? ('决策点 ' + movers.join('、')) : '本局未涉及'
      ]);
    });
    B.push(wtbl(ledgerRows));
  });

  // 四、Matland 复盘
  B.push(wp('四、Matland 复盘', 'Heading1'));
  B.push(wp(matlandReview(res), 'Normal'));

  var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' + B.join('') +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>' +
    '</w:body></w:document>';

  return zipStore([
    { name: '[Content_Types].xml', data: utf8(DOCX_CT) },
    { name: '_rels/.rels', data: utf8(DOCX_RELS) },
    { name: 'word/_rels/document.xml.rels', data: utf8(DOCX_DOC_RELS) },
    { name: 'word/styles.xml', data: utf8(docxStyles()) },
    { name: 'word/document.xml', data: utf8(doc) }
  ]);
}
