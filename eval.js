function addParam(ast, env, templateName) {
  if(ast.INNERDTEXT) {
    env.bindings[templateName]['params'].push(ast.INNERDTEXT)
  } else if(ast.tparam) {
    env.bindings[templateName]['params'].push(lookup_param(ast.tparam.pname), env);
  }
}

function processBody(ast, env, templateName) {
  if(ast) {
    if(ast.tparam) {
      processDefinition(ast.templatedef, env);
      processBody(ast.next, env, templateName);
    }
    if(ast.next) {
      processBody(ast.next, env, templateName);
    }
  }
}

function addBody(ast, env, templateName) {
  env.bindings[templateName]['body'] = ast;
}

function processParams(ast, env, templateName) {
  if(ast) {
    if(!ast.next) {
      addBody(ast.dtext, env, templateName);
    } else {
      addParam(ast.dtext, env, templateName);
      processParams(ast.next, env, templateName);
    }
  }
}

//just returning the first one i find.... wrong
function lookup_param(param, env) {
  for(var binding in env.bindings) {
    if(env.bindings[binding].params[param]) {
      return env.bindings[binding].params[param]
    }
  }
  if(env.parent) {
    return lookup_param(param, env.parent)
  }
}

function processDefinition(ast, env) {
  if(ast.dtext) {
    var templateName = "";
    if(ast.dtext.INNERDTEXT) {
      templateName = ast.dtext.INNERDTEXT;
    } else if(ast.dtext.tparam) {
      templateName = lookup_param(ast.dtext.tparam.pname, env);
    }
    env.bindings[templateName] = {
      params : [],
      body : undefined,
      env : undefined
    };
  }
  env.bindings[templateName].env = Object.assign({}, env)
  if(ast.dparams) {
    processParams(ast.dparams, env, templateName);
  }
  return templateName;
}

function bind(ast, env, templateName) {
  if(templateName) {
    let params = env.bindings[templateName].params;
    params[params.shift()] = getArg(ast, env, "");
  }
}

function processBindings(ast, env, templateName, index) {
  bind(ast.itext, env, templateName, index);
  if(ast.next) {
    processBindings(ast.next, env, templateName);
  }
}

function evalInvocation(ast, env) {
  if(ast.itext) {
    var templateName = "";
    if(ast.itext.INNERTEXT) {
      templateName = ast.itext.INNERTEXT;
    } else if(ast.itext.tparam) {
      templateName = lookup(ast.itext.tparam.pname, env);
    }
    if(ast.targs) {
      processBindings(ast.targs, env, templateName);
    }
  }
}

function evalBody(ast, env, result) {
  if(ast) {
    if(ast.templatedef && ast.next) {
      processDefinition(ast.templatedef, env);
      result = evalBody(ast.next, env, result);
    } else if(ast.OUTERTEXT) {
      result += ast.OUTERTEXT;
      if(ast.next) {
        result = evalBody(ast.next, env, result);
      } else {
        return result;
      }
    } else if(ast.tparam) {
      let temp_result = lookup_param(ast.tparam.pname, env);
      if(typeof temp_result === "object") {
        result = evalBody(temp_result, env, result)
      } else {
        result += temp_result;
      }
      if(ast.next) {
        result = evalBody(ast.next, env, result);
      } else{
        return result;
      }
    } else if(ast.INNERDTEXT || ast.INNERTEXT) {
      let temp = ast.INNERTEXT ? ast.INNERTEXT : ast.INNERDTEXT
      result += temp;
      if(ast.next) {
        result = evalBody(ast.next, env, result);
      } else {
        return result;
      }
    } else if(ast.templateinvocation) {
      let templateName = "";
      if(ast.templateinvocation.itext.INNERTEXT) {
        templateName = ast.templateinvocation.itext.INNERTEXT;
      } else if(ast.templateinvocation.itext.tparam) {
        templateName = lookup_param(ast.templateinvocation.itext.tparam.pname, env);
      }
      if(!templateName) {
        result = evalBody(ast.templateinvocation.itext.next, env, result);
        if(!result) {
          result = "";
        } else {
          var anonymous = unstringify(result);
          result = "";
        }
        let newEnv = createEnv(env);
        newEnv.bindings = Object.assign({}, newEnv.parent.bindings);
        if(anonymous) {
          env.bindings['`'] = anonymous;
        }
        templateName = '`'
        evalInvocation(ast.templateinvocation, env);
        if(env.bindings['`']) {
            let body = lookup(templateName, env.bindings[templateName].env).body;
            var concat = evalBody(body, newEnv, result);
            result = evalBody(ast.next, env, concat);
        }
      } else {
        let special = {
          '#if' : true,
          '#ifeq' : true,
          '#expr' : true
        }
        if(special[templateName]) {
          let newEnv = createEnv(env);
          newEnv.bindings = Object.assign({}, newEnv.parent.bindings);
          result += evalSpecial(templateName, ast, newEnv , result);
          result = evalBody(ast.next, env, result);
        } else {
          let newEnv = createEnv(lookup(templateName, env).env);
          newEnv.bindings = Object.assign({}, newEnv.parent.bindings);
          evalInvocation(ast.templateinvocation, env);
          let body = lookup(templateName, env.bindings[templateName].env).body;
          var concat = evalBody(body, newEnv, result);
          result = evalBody(ast.next, env, concat);
        }
      }
    }
  }
  if(result) {
    return result;
  }
}
/*
  evaluates outer AST nodes and makes to calls to helper functions
  that will evaluate inner types.
*/
function evalWML(ast,env) {
  env = createEnv(null);
  var result = evalBody(ast, env, "");
  console.log(result);
}

function evalIf(ast, env, result) {
  if(ast.itext) {
    if(ast.itext.INNERTEXT) {
      return evalBody(ast.next.itext, env, result); // true
    } else if(ast.itext.tparam) {
      if(lookup_param(ast.tparam.pname, env)) {
        return evalBody(ast.next.itext, env, result);
      }
    } else if(ast.itext.templatedef && ast.itext.next) {
      processDefinition(ast.itext.templatedef, env);
      //just used as a check to see if something is eventually returned after the def
      if(evalBody(ast.itext.next, env, "")) {
        return evalBody(ast.next, env, result)
      } else {
        return evalBody(ast.next.next.itext, env, result)
      }
    } else {
      return evalBody(ast.next.next.itext, env, result)
    }
  } else {
    return evalBody(ast.next.next.itext, env, result);
  }
}

function getArg(ast, env, arg) {
  if(ast.INNERTEXT) {
    arg += ast.INNERTEXT;
  } else if(ast.tparam) {
    arg += lookup_param(ast.tparam.pname, env);
  } else if(ast.templateinvocation) {
    arg += evalBody(ast, env, "");
  } else if(ast.templatedef) {
    templateName = processDefinition(ast.templatedef, env);
    if(!ast.next) {
      arg = stringify(env.bindings[templateName]);
    }
  }
  if(ast.next) {
    arg = getArg(ast.next, env, arg);
  }
  return arg;
}

function evalIfEq(ast, env, result) {
  if(ast.itext) {
    var arg1 = getArg(ast.itext, env, "");
    var arg2 = getArg(ast.next.itext, env, "");
  }
  if(arg1 === arg2) {
    return evalBody(ast.next.next.itext, env, result);
  } else {
    return evalBody(ast.next.next.next.itext, env, result);
  }
}

function evalExpr(ast, env, result) {
  if(ast.itext) {
    var stringExpr = getArg(ast.itext, env, "");
  }
  return eval(stringExpr);
}

function evalSpecial(name, ast, env, result) {
  if(name === "#if"){
    return evalIf(ast.templateinvocation.targs, env, result);
  } else if(name === "#ifeq") {
    return evalIfEq(ast.templateinvocation.targs, env, result);
  } else {
    return evalExpr(ast.templateinvocation.targs, env, result);
  }
}

function createEnv(parent) {
  if(!parent) {
    parent = null;
  }
  return {
    name : Math.random(),
    bindings : {},
    parent : parent
  }
}

function lookup(name, env) {
  let key = env.bindings[name];
  if(key) {
    return key;
  } else if(env.parent) {
    return lookup(name, env.parent);
  }
  return null;
}
