import { ethers } from 'ethers';
import dotenv from 'dotenv';
import axios from 'axios';
import { getBySymbolABI } from '../configs/ABIs.js';
import { getContractAddress } from '../configs/addresses.js';
import { NETWORK_CONSTANT } from '../configs/RPCs.js';
import { shuffle } from './random.js';
import Web3 from 'web3';
import { PRIVATE_KEY_SWAP_SIGNER } from './constant.js';

dotenv.config();

let currentRPC = '';
export const setCurrentRPC = rpc => {
  currentRPC = rpc;
};
export const getCurrentRPC = () => {
  return currentRPC;
};

export async function getProvider(chainId) {
  let rpc;
  let provider;
  chainId = typeof chainId !== 'string' ? chainId?.toString() : chainId;

  const CurrentRPC = getCurrentRPC();

  let listChainIdUrlRPCs = NETWORK_CONSTANT.filter(info => info.chainId == chainId && info.rpc !== CurrentRPC);
  listChainIdUrlRPCs = shuffle(listChainIdUrlRPCs);

  for (let i = 0; i < listChainIdUrlRPCs.length; i++) {
    if (chainId === listChainIdUrlRPCs[i].chainId) {
      try {
        rpc = listChainIdUrlRPCs[i].rpc;
        await axios.post(rpc, {
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: ['latest', false],
          id: 1,
        });

        provider = new ethers.providers.JsonRpcProvider(rpc);
        setCurrentRPC(rpc);
        break;
      } catch (error) {
        console.error(error);
      }
    }
  }
  if (!rpc) throw { error: `ChainId ${chainId} is not supported yet` };
  if (!provider) throw { error: `ChainId ${chainId} is not connect to RPC` };
  return provider;
}

export async function createInstance(chainId, symbolABI, symbolDex) {
  const provider = await getProvider(chainId);
  const contractAddress = getContractAddress(chainId, symbolDex);
  const abi = getBySymbolABI(symbolABI);
  return !!contractAddress && !!abi ? new ethers.Contract(contractAddress, abi, provider) : null;
}

export async function createInstanceAddress(chainId, symbolABI, address, provider) {
  provider = provider || (await getProvider(chainId));
  const abi = getBySymbolABI(symbolABI);
  return abi ? new ethers.Contract(address, abi, provider) : null;
}

export async function createSignature({
  chainId,
  methodName,
  amountWei,
  tokenIn,
  tokenOut,
  from,
  to,
  expireBlock,
  nonce,
}) {
  const provider = await getProvider(chainId);
  const web3 = new Web3(new Web3.providers.HttpProvider(provider.connection.url));

  let message = Web3.utils.soliditySha3(
    { t: 'uint256', v: chainId },
    { t: 'string', v: methodName },
    { t: 'uint256', v: amountWei },
    { t: 'address', v: tokenIn },
    { t: 'address', v: tokenOut },
    { t: 'address', v: from },
    { t: 'address', v: to },
    { t: 'uint256', v: expireBlock },
    { t: 'uint256', v: nonce },
  );
  // eslint-disable-next-line no-undef
  const privateKeyBuffer = Buffer.from(PRIVATE_KEY_SWAP_SIGNER, 'hex');
  const signature = web3.eth.accounts.sign(message, privateKeyBuffer);

  let dataEncoded = web3.eth.abi.encodeParameters(
    ['uint256', 'uint256', 'bytes'], // [exprieBlock, nonce, signature]
    [expireBlock, nonce, signature.signature],
  );
  return dataEncoded;
}
