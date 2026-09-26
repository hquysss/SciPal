'use client';

import { Component, type ReactNode } from 'react';

interface HeroSceneBoundaryProps {
  onError: () => void;
  children: ReactNode;
}

/** Catches a failed scene chunk load or render so the hero keeps its SVG instead of crashing the page. */
export class HeroSceneBoundary extends Component<HeroSceneBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
