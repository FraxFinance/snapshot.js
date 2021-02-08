import { formatUnits } from '@ethersproject/units';
import { multicall } from '../../utils';

export const author = 'alirun';
export const version = '0.0.1';

const DECIMALS = 18;

const abi = [
  {
    constant: true,
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  }
];

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

export async function strategy(
  space,
  network,
  provider,
  addresses,
  options,
  snapshot
) {
  const blockTag = typeof snapshot === 'number' ? snapshot : 'latest';

  // Fetch FXS Balance
  const fxsQuery = addresses.map((address: any) => [
    options.FXS,
    'balanceOf',
    [address]
  ]);

  // Fetch FARMING_UNI_LP_FRAX_FXS Balance
  const farmingUniLPFraxFxsQuery = addresses.map((address: any) => [
    options.FARMING_UNI_LP_FRAX_FXS,
    'balanceOf',
    [address]
  ]);

  const response = await multicall(
    network,
    provider,
    abi,
    [
      // Get 1inch LP OPIUM-ETH balance of OPIUM
      // [options.OPIUM, 'balanceOf', [options.LP_1INCH_OPIUM_ETH]],
      // Get total supply of 1inch LP OPIUM-ETH
      // [options.LP_1INCH_OPIUM_ETH, 'totalSupply'],
      ...fxsQuery,
      ...farmingUniLPFraxFxsQuery,

    ],
    { blockTag }
  );


  

  // const opiumLp1inchOpiumEth = response[0];
  // const opiumLp1inchOpiumEthTotalSupply = response[1];
  // const responseClean = response.slice(2, response.length);

  console.log(response)

  const responseClean = response.slice(0, response.length);

  const chunks = chunk(responseClean, addresses.length);
  const fxsBalances = chunks[0];
  const farmUniFraxFxsBalances = chunks[1];
  // const lp1inchOpiumEthBalances = chunks[2];
  // const farmingLp1inchOpiumEthBalances = chunks[3];

  // return Object.fromEntries(
  //   Array(addresses.length)
  //     .fill('x')
  //     .map((_, i) => [
  //       addresses[i],
  //       parseFloat(
  //         formatUnits(
  //           // OPIUM
  //           fxsBalances[i][0]
  //             // wOPIUM
  //             .add(farmUniFraxFxsBalances[i][0])
  //             // LP 1inch OPIUM-ETH + farming
  //             .add(
  //               opiumLp1inchOpiumEth[0]
  //                 .mul(
  //                   lp1inchOpiumEthBalances[i][0].add(
  //                     farmingLp1inchOpiumEthBalances[i][0]
  //                   )
  //                 )
  //                 .div(opiumLp1inchOpiumEthTotalSupply[0])
  //             )
  //             .toString(),
  //           DECIMALS
  //         )
  //       )
  //     ])
  // );
  return Object.fromEntries(
    Array(addresses.length)
      .fill('x')
      .map((_, i) => [
        addresses[i],
        parseFloat(
          formatUnits(
            fxsBalances[i][0]
            .add(farmUniFraxFxsBalances[i][0])
            
            
            .toString(),
            DECIMALS
          )
        )
      ])
  );
}
