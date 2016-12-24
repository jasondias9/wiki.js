WML Interpreter
---------------

A Wiki Markup Language interpreter written in Javascript that parses and evaluates
the language. Functions can be defined and evaluated.

Language Features
-----------------
* An LL(1) top - down parser
* Static environment scoping
* Support for recursive definitions
* Equality evaluation, and simple arithmetic, implemented using  
  in built javascript
  ```javascript
  eval();
  ```
  *Note:* There is a clear exploit here, sanitization should be added. 



Examples
-------
* `{: hello | name | Hello {{{name}}}! :}`
  A template (function) definition taking an arbitrary list of parameters,
  and evaluating some body, here with reference to the parameter *name*.
* `{{ hello | World }}`
  A template invocation (function call) passing the string parameter *World*.
  Evaluates here to the string, "Hello World!".


The following was written as part of assignment tasks for COMP 302 at
McGill University.
