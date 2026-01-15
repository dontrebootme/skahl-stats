import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Input } from './Input'
import React from 'react'

describe('Input', () => {
    it('renders correctly', () => {
        render(<Input placeholder="Test Input" />)
        const input = screen.getByPlaceholderText('Test Input')
        expect(input).toBeInTheDocument()
    })

    it('forwards refs', () => {
        const ref = React.createRef<HTMLInputElement>()
        render(<Input ref={ref} />)
        expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })

    it('accepts additional props', () => {
        render(<Input data-testid="test-input" />)
        expect(screen.getByTestId('test-input')).toBeInTheDocument()
    })
})
