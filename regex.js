var reg = {
  TSTART : /^\s*{{\s*(?!{)/,
  TEND : /^\s*}}\s*(?!})/,
  DSTART : /^\s*{:\s*/,
  DEND : /^\s*:}\s*/,
  PSTART : /^\s*{{{\s*/,
  PEND : /^\s*}}}/,
  PIPE : /^\s*\|\s*/,
  OUTERTEXT : /^[^{]+/,

  INNERTEXT : /^((?!{{|\||}}|{{{|{:)[\S])+/,
  INNERDTEXT : /^((?!{{|\||:}|{{{|{:).)+/,
  PNAME : /.+?(?=\||}}})/
};
