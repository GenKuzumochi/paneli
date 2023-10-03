// https://github.com/FormidableLabs/react-live/blob/master/packages/react-live/src/utils/transpile/
// LICENSE: MIT https://github.com/FormidableLabs/react-live/blob/master/LICENSE

import * as React from "react";
import { Component, ComponentType, isValidElement } from "react"
import { transform as _transform, Transform } from "sucrase";

/**
 * Creates a new composite function that invokes the functions from right to left
 */

export default function compose<T>(...functions: ((...args: T[]) => T)[]) {
  return functions.reduce(
    (acc, currentFn) =>
      (...args: T[]) =>
        acc(currentFn(...args))
  );
}

// transform

const defaultTransforms: Transform[] = ["jsx", "imports"];

type Options = {
  transforms?: Transform[];
};

function transform(opts: Options = {}) {
  const transforms = Array.isArray(opts.transforms)
    ? opts.transforms.filter(Boolean)
    : defaultTransforms;

  return (code: string) => _transform(code, { transforms }).code;
}

// evalCode


const evalCode = (
  code: string,
  scope: Record<string, unknown>
): ComponentType => {
  const scopeKeys = Object.keys(scope);
  const scopeValues = scopeKeys.map((key) => scope[key]);
  return new Function(...scopeKeys, code)(...scopeValues);
};

///errorBoundary

const errorBoundary = (
    Element: ComponentType,
    errorCallback: (error: Error) => void
  ) => {
    return class ErrorBoundary extends Component {
      componentDidCatch(error: Error) {
        errorCallback(error);
      }
  
      render() {
        return typeof Element === "function" ? (
          <Element />
        ) : isValidElement(Element) ? (
          Element
        ) : null;
      }
    };
  };
  


const jsxConst = 'const _jsxFileName = "";';
const trimCode = (code: string) => code.trim().replace(/;$/, "");
const spliceJsxConst = (code: string) => code.replace(jsxConst, "").trim();
const addJsxConst = (code: string) => jsxConst + code;
const wrapReturn = (code: string) => `return (${code})`;

type GenerateOptions = {
  code: string;
  scope?: Record<string, unknown>;
  enableTypeScript: boolean;
};

export const generateElement = (
  { code = "", scope = {}, enableTypeScript = true }: GenerateOptions,
  errorCallback: (error: Error) => void
) => {
  console
  /**
   * To enable TypeScript we need to transform the TS to JS code first,
   * splice off the JSX const, wrap the eval in a return statement, then
   * transform any imports. The two-phase approach is required to do
   * the implicit evaluation and not wrap leading Interface or Type
   * statements in the return.
   */

  const firstPassTransforms: Transform[] = ["jsx"];
  enableTypeScript && firstPassTransforms.push("typescript");

  const transformed = compose<string>(
    addJsxConst,
    transform({ transforms: ["imports"] }),
    wrapReturn,
    spliceJsxConst,
    trimCode,
    transform({ transforms: firstPassTransforms }),
    trimCode
  )(code);

  return errorBoundary(
    evalCode(transformed, { React, ...scope }),
    errorCallback
  );
};

export const renderElementAsync = (
  { code = "", scope = {}, enableTypeScript = true }: GenerateOptions,
  resultCallback: (sender: ComponentType) => void,
  errorCallback: (error: Error) => void
  // eslint-disable-next-line consistent-return
) => {
  const render = (element: ComponentType) => {
    if (typeof element === "undefined") {
      errorCallback(new SyntaxError("`render` must be called with valid JSX."));
    } else {
      resultCallback(errorBoundary(element, errorCallback));
    }
  };

  if (!/render\s*\(/.test(code)) {
    return errorCallback(
      new SyntaxError("No-Inline evaluations must call `render`.")
    );
  }

  const transforms: Transform[] = ["jsx", "imports"];
  enableTypeScript && transforms.splice(1, 0, "typescript");

  evalCode(transform({ transforms })(code), { React, ...scope, render });
};