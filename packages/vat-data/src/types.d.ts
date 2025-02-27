/**
 * @file Types for vat-data
 *
 * Facet is a single object with methods.
 * Behavior is a description when defining a kind of what facets it will have.
 * For the non-multi defineKind, there is just one facet so it doesn't have a key.
 */
import type {
  InterfaceGuard,
  MapStore,
  SetStore,
  StoreOptions,
  WeakMapStore,
  WeakSetStore,
} from '@agoric/store';

type Baggage = MapStore<string, unknown>;

type Tail<T extends any[]> = T extends [head: any, ...rest: infer Rest]
  ? Rest
  : [];

type MinusContext<
  F extends (context, ...rest: any[]) => any,
  P extends any[] = Parameters<F>, // P: are the parameters of F
  R = ReturnType<F>, // R: the return type of F
> = (...args: Tail<P>) => R;

type KindFacet<O> = { [K in keyof O]: MinusContext<O[K]> };

type KindFacets<B> = {
  [FacetKey in keyof B]: KindFacet<B[FacetKey]>;
};

type KindContext<S, F> = { state: S; self: KindFacet<F> };
type MultiKindContext<S, B> = { state: S; facets: KindFacets<B> };

type PlusContext<C, M> = (c: C, ...args: Parameters<M>) => ReturnType<M>;
type FunctionsPlusContext<C, O> = { [K in keyof O]: PlusContext<C, O[K]> };

declare class DurableKindHandleClass {
  private descriptionTag: string;
}
export type DurableKindHandle = DurableKindHandleClass;

/**
 * Grab bag of options that can be provided to `defineDurableKind` and its
 * siblings. Not all options are meaningful in all contexts. See the
 * doc-comments on each option.
 */
type DefineKindOptions<C> = {
  /**
   * If provided, the `finish` function will be called after the instance is
   * made and internally registered, but before it is returned. The finish
   * function is to do any post-intantiation initialization that should be
   * done before exposing the object to its clients.
   */
  finish?: (context: C) => void;

  /**
   * Meaningful to `makeScalarBigMapStore` and its siblings. These maker
   * fuctions will make either virtual or durable stores, depending on
   * this flag. Defaults to off, making virtual but not durable collections.
   *
   * Generally, durable collections are provided with `provideDurableMapStore`
   * and its sibling, which use this flag internally. If you do not make
   * durable collections by other means, you can consider this as
   * intended for internal use only.
   */
  durable?: boolean;

  /**
   * Intended for internal use only.
   * Should the raw methods receive their `context` argument as their first
   * argument or as their `this` binding? For `defineDurableKind` and its
   * siblings (including `vivifySingleton`), this defaults to off, meaning that
   * their behavior methods receive `context` as their first argument.
   * `vivifyFarClass` and its siblings (including `vivifyFarInstance`) use
   * this flag internally to indicate that their methods receive `context`
   * as their `this` binding.
   */
  thisfulMethods?: boolean;

  /**
   * Intended for internal use only.
   * If an `interfaceGuard` is provided, then the raw methods passed alongside
   * it wrapped by a function that first checks that this method's guard
   * pattern is satisfied before calling the raw method.
   *
   * In `defineDurableKind` and its siblings, this defaults to off.
   * `vivifyFarClass` use this internally to protect their raw class methods
   * using the provided interface.
   */
  interfaceGuard?: InterfaceGuard<unknown>;
};

export type VatData = {
  // virtual kinds
  defineKind: <P, S, F>(
    tag: string,
    init: (...args: P) => S,
    facet: F,
    options?: DefineKindOptions<KindContext<S, F>>,
  ) => (...args: P) => KindFacet<F>;
  defineKindMulti: <P, S, B>(
    tag: string,
    init: (...args: P) => S,
    behavior: B,
    options?: DefineKindOptions<MultiKindContext<S, B>>,
  ) => (...args: P) => KindFacets<B>;

  // durable kinds
  makeKindHandle: (descriptionTag: string) => DurableKindHandle;
  defineDurableKind: <P, S, F>(
    kindHandle: DurableKindHandle,
    init: (...args: P) => S,
    facet: F,
    options?: DefineKindOptions<KindContext<S, F>>,
  ) => (...args: P) => KindFacet<F>;
  defineDurableKindMulti: <P, S, B>(
    kindHandle: DurableKindHandle,
    init: (...args: P) => S,
    behavior: B,
    options?: DefineKindOptions<MultiKindContext<S, B>>,
  ) => (...args: P) => KindFacets<B>;

  providePromiseWatcher: unknown;
  watchPromise: unknown;

  makeScalarBigMapStore: <K, V>(
    label: string,
    options?: StoreOptions,
  ) => MapStore<K, V>;
  makeScalarBigWeakMapStore: <K, V>(
    label: string,
    options?: StoreOptions,
  ) => WeakMapStore<K, V>;

  makeScalarBigSetStore: <K>(
    label: string,
    options?: StoreOptions,
  ) => SetStore<K>;
  makeScalarBigWeakSetStore: <K>(
    label: string,
    options?: StoreOptions,
  ) => WeakSetStore<K>;
  canBeDurable: (specimen: unknown) => boolean;
};

// The JSDoc is repeated here and at the function definition so it appears
// in IDEs where it's used, regardless of type resolution.
interface PickFacet {
  /**
   * When making a multi-facet kind, it's common to pick one facet to
   * expose. E.g.,
   *
   *     const makeFoo = (a, b, c, d) => makeFooBase(a, b, c, d).self;
   *
   * This helper reduces the duplication:
   *
   *     const makeFoo = pickFacet(makeFooBase, 'self');
   */
  <M extends (...args: any[]) => any, F extends keyof ReturnType<M>>(
    maker: M,
    facetName: F,
  ): (...args: Parameters<M>) => ReturnType<M>[F];
}

type VivifyKind = <P, S, F>(
  baggage: Baggage,
  tag: string,
  init: (...args: P) => S,
  facet: F,
  options?: DefineKindOptions<KindContext<S, F>>,
) => (...args: P) => KindFacet<F>;

type VivifyKindMulti = <P, S, B>(
  baggage: Baggage,
  tag: string,
  init: (...args: P) => S,
  behavior: B,
  options?: DefineKindOptions<MultiKindContext<S, B>>,
) => (...args: P) => KindFacets<B>;
