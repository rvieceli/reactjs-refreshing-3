import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const LOCAL_STORAGE_CART_KEY = "@RocketShoes:cart";

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const firstAttempt = useRef(true);
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(LOCAL_STORAGE_CART_KEY);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    if (firstAttempt.current) {
      firstAttempt.current = false;
    } else {
      localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(cart));
    }
  }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const { data: product } = await api.get<Product>(`products/${productId}`);
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      const existentProduct = cart.find((product) => product.id === productId);
      const amount = (existentProduct?.amount ?? 0) + 1;

      if (stock.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (!product) {
        throw new Error();
      }

      setCart([
        ...cart.filter((product) => product.id !== productId),
        { ...product, amount },
      ]);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existentProduct = cart.find((product) => product.id === productId);

      if (!existentProduct) {
        throw new Error("Product does not exists");
      }

      setCart(cart.filter((product) => product.id !== productId));
    } catch (e) {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      const existentProduct = cart.find((product) => product.id === productId);

      if (!existentProduct) {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }

      if (stock.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      setCart(
        cart.map((product) => ({
          ...product,
          amount: product.id === productId ? amount : product.amount,
        }))
      );
    } catch (e: unknown) {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
