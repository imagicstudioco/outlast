"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWalletClient, usePublicClient, useConnect } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { Button } from "./Button";
import { Card } from "./Card";
import { API_BASE_URL } from '../config';
import { injected } from 'wagmi/connectors';
import { Icon } from "./Icon";
import { sdk } from '@farcaster/frame-sdk'



export function Blank() {

return (
  <div className="space-y-6 animate-fade-in">
    
    </div>
  );
}