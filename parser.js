function scan(s, tokenset) {
  if(!s) {
    return;
  }
  for (var k in tokenset) {
    if(tokenset[k]) {
      var res = s.match(reg[k]);
      if(res) {
        return {
          token : k,
          tokenvalue : res[0]
        }
      }
    }
  }
}

function parse(s) {
  if(!s) {
    return "Invalid Input";
  }
  return parseOuter(s);
}

function parseOuter(s) {
  if(!s) {
    return null;
  }
  TOKENSET = {
    OUTERTEXT : true,
    TSTART : true,
    DSTART : true
  }
  var t = scan(s,TOKENSET);
  if(!t) {
    return null;
  }
  if(t.token === "OUTERTEXT") {
    var val = t.tokenvalue.trim();
    if(!val) {
      return null;
    }
    return {
      name : "outer",
      OUTERTEXT : val,
      templateinvocation : null,
      templatedef : null,
      next : parseOuter(s.substr(t.tokenvalue.length))
    }
  } else if(t.token === "TSTART") {
    return {
      name : "outer",
      OUTERTEXT : null,
      templateinvocation : parseTemplateInvocation(s),
      templatedef: null,
      next : parseOuter(s.substr((s.match(/^({{.*}})/)[0]).length))
    }
  } else if(t.token === "DSTART") {
    return {
      name : "outer",
      OUTERTEXT : null,
      templateinvocation : null,
      templatedef : parseTemplateDef(s),
      next : parseOuter(s.substr((s.match(/^({:.*:})/)[0]).length))
    }
  }
}

function matchD(s) {
  var dstack = [];
  var pos = 0;
  dstack.push(s.substr(pos,2));
  pos += 2;
  while(s.charAt(pos)) {
    if(s.substr(pos,2).match(/({:)/) || s.substr(pos,2).match(/(:})/)) {
      if (s.substr(pos,2).match(/({:)/)) {
        dstack.push(s.substr(pos,2));
        pos += 2;
      }
      if(s.substr(pos,2).match(/(:})/)) {
        dstack.pop();
        pos += 2;
      }
      if(dstack.length < 1) {
        return pos;
      }
    } else {
      pos += 1;
    }
  }
  return pos - 1;
}

function matchT(s) {
  var tstack = [];
  var pstack = [];
  var pos = 0;
  tstack.push(s.substr(pos,2));
  pos += 2;
  while(s.charAt(pos)) {
    if(s.substr(pos,2).match(/({){2}/) || s.substr(pos,2).match(/(}){2}/)) {
      if (s.substr(pos,2).match(/({){2}/)) {
        if(s.substr(pos,3).match(/({){3}/) && s.charAt(pos+3) !== '{') {
          pstack.push(s.substr(pos,3));
          pos += 3;
        } else {
          tstack.push(s.substr(pos,2));
          pos += 2;
        }
      }
      if(s.substr(pos,2).match(/(}){2}/)) {
        if(s.substr(pos,3).match(/(}){3}/) && pstack.length > 0) {
          pstack.pop();
          pos += 3
        } else{
          tstack.pop();
          pos += 2;
        }
        if(tstack.length < 1) {
          return pos;
        }
      }
    } else {
      pos += 1;
    }
  }
  return pos - 1;
}

function parseIText(s) {
  if(!s) {
    return;
  }
  TOKENSET = {
    TSTART : true,
    INNERTEXT : true,
    PSTART : true,
    PIPE : true,
    DSTART : true
  }
  var t = scan(s,TOKENSET);
  if(!t) {
    return null;
  }
  if(t.token === "INNERTEXT") {
    var val = t.tokenvalue.trim();
    if(!val) {
      return null;
    }
    return {
      name : "itext",
      INNERTEXT : val,
      templateinvocation : null,
      templatedef : null,
      tparam : null,
      next : parseIText(s.substr(t.tokenvalue.length))
    }
  } else if(t.token === "TSTART") {
      return {
        name : "itext",
        INNERTEXT : null,
        templateinvocation : parseTemplateInvocation(s),
        templatedef : null,
        tparam : null,
        next : parseIText(s.substr(matchT(s)))
      }
  } else if(t.token === "DSTART") {
  return {
    name : "itext",
    INNERTEXT : null,
    templateinvocation : null,
    templatedef : parseTemplateDef(s),
    tparam : null,
    next : parseIText(s.substr(matchD(s)))
  }
} else if(t.token === "PSTART") {
    return {
      name : "itext",
      INNERTEXT : null,
      templateinvocation : null,
      templatedef : null,
      tparam : parseTParam(s.substr(t.tokenvalue.length)),
      next: parseIText(s.substr((s.match(/^({{{.*?}}})/)[0]).length))
    }
  } else if(t.token === "PIPE") {
    return parseIText(s.substr(t.tokenvalue.length));
  }
}

function parseTemplateInvocation(s) {
  if(!s) {
    return;
  }
  TOKENSET = {
    TSTART : true,
    PIPE : true,
  }
  var t = scan(s,TOKENSET);
  if(!t) {
    return null;
  }
  if(t.token === "TSTART") {
    return {
      name : "templateinvocation",
      itext : parseIText(s.substr(t.tokenvalue.length)),
      targs : null
    }
  } else if(t.token === "PIPE") {
      return{
        name : "templateinvocation",
        itext : null,
        targs : parseIText(s.substr(t.tokenvalue.length))
      }
  }
}

function parseDText(s) {
  if(!s) {
    return;
  }
  TOKENSET = {
    INNERDTEXT : true,
    DSTART : true,
    TSTART : true,
    PIPE : true,
    PSTART: true
  }
  var t = scan(s,TOKENSET);
  if(!t) {
    return null;
  }
  if(t.token === "INNERDTEXT") {
    var val = t.tokenvalue.trim();
    if(!val) {
      return null;
    }
    return {
      name : "dtext",
      INNERDTEXT : val,
      templateinvocation : null,
      templatedef : null,
      tparam : null,
      next : null
    }
  } else if(t.token === "TSTART") {
      return {
        name : "dtext",
        INNERDTEXT : null,
        templateinvocation : parseTemplateInvocation(s),
        templatedef : null,
        tparam : null,
        next : null
      }
  } else if(t.token === "DSTART") {
    return {
      name : "dtext",
      INNERDTEXT : null,
      templateinvocation : null,
      templatedef : parseTemplateDef(s),
      tparam : null,
      next : null
    }
  } else if(t.token === "PSTART") {
    return {
      name : "dtext",
      INNERDTEXT : null,
      templateinvocation : null,
      templatedef : null,
      tparam : parseTParam(s.substr(t.tokenvalue.length)),
      next : null
    }
  } else if(t.token === "PIPE") {
    return parseDText(s.substr(t.tokenvalue.length));
  }
}

function parseTemplateDef(s) {
  if(!s) {
    return;
  }
  TOKENSET = {
    DSTART : true,
    PIPE : true,
  }
  var t = scan(s,TOKENSET);
  if(!t) {
    return null;
  }
  if(t.token === "DSTART") {
    return {
      name : "templatedef",
      dtext : parseDText(s.substr(t.tokenvalue.length))
      dparams : null
    }
  } else if(t.token === "PIPE") {
      return {
        name : "templatedef",
        dtext : parseDText(s.substr(t.tokenvalue.length)),
        dparams : parseDText(s.substr(t.tokenvalue.length)),
      }
  }
}

function parseTParam(s) {
  if(!s) {
    return;
  }
  TOKENSET = {
    PNAME : true
  }
  var t = scan(s,TOKENSET);
  if(!t) {
    return null;
  }
  var val = t.tokenvalue.trim();
  if(!val) {
    return null
  }
  return {
    name : "tparam",
    PNAME : val
  }
}

var TOKENSET = {
}
